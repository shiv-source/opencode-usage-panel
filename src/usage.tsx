import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { isPeak, readConfig } from "./config"
import { share } from "./format"
import { costOf, ratesFor } from "./pricing"
import type { Bucket, Counts, Usage } from "./types"

const ZERO: Counts = { input: 0, output: 0, reasoning: 0, cacheRead: 0 }

const FIELDS: Array<[keyof Counts, string]> = [
  ["input", "input"],
  ["output", "output"],
  ["reasoning", "reasoning"],
  ["cacheRead", "cache read"],
]

function counts(tokens: AssistantMessage["tokens"]): Counts {
  return {
    input: tokens.input,
    output: tokens.output,
    reasoning: tokens.reasoning,
    cacheRead: tokens.cache.read,
  }
}

function merge(a: Counts, b: Counts): Counts {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    reasoning: a.reasoning + b.reasoning,
    cacheRead: a.cacheRead + b.cacheRead,
  }
}

function total(value: Counts): number {
  return value.input + value.output + value.reasoning + value.cacheRead
}

function contextOf(api: TuiPluginApi, sessionID: string): { tokens: number; percent: number | null } {
  const last = api.state.session.messages(sessionID).findLast(
    (item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0,
  )
  if (!last) return { tokens: 0, percent: null }
  const tokens =
    last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
  const model = api.state.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
  return { tokens, percent: model?.limit.context ? Math.round((tokens / model.limit.context) * 100) : null }
}

export function read(
  api: TuiPluginApi,
  sessionID: string,
  options: Record<string, unknown> | undefined,
): { models: Usage[]; cost: number; surcharge: number; context: { tokens: number; percent: number | null } } {
  const config = readConfig(options)
  const buckets = new Map<string, Bucket>()
  let surcharge = 0

  for (const message of api.state.session.messages(sessionID)) {
    if (message.role !== "assistant") continue
    const value = counts(message.tokens)
    if (total(value) === 0) continue

    const key = `${message.providerID}/${message.modelID}`
    let bucket = buckets.get(key)
    if (!bucket) {
      const info = ratesFor(api, message.providerID, message.modelID, config)
      bucket = {
        key,
        name: info.name,
        explicit: info.explicit,
        known: false,
        off: info.off,
        peak: info.peak,
        tokens: ZERO,
        cost: 0,
      }
      buckets.set(key, bucket)
    }

    bucket.tokens = merge(bucket.tokens, value)

    if (bucket.explicit) {
      const onPeak = bucket.peak !== undefined && isPeak(config, message.time.created)
      const rates = onPeak && bucket.peak ? bucket.peak : bucket.off
      const actual = costOf(value, rates)
      bucket.cost += actual
      if (onPeak) surcharge += actual - costOf(value, bucket.off)
    } else {
      bucket.cost += message.cost
    }

    if (bucket.explicit || message.cost > 0) bucket.known = true
  }

  const models = [...buckets.values()]
    .sort((a, b) => b.cost - a.cost || total(b.tokens) - total(a.tokens))
    .map<Usage>((bucket) => ({
      key: bucket.key,
      name: bucket.name,
      known: bucket.known,
      cost: bucket.cost,
      tokens: total(bucket.tokens),
      rows: [
        { label: "Tokens", value: total(bucket.tokens), percent: "" },
        ...FIELDS.map(([field, label]) => ({
          label,
          value: bucket.tokens[field],
          percent: share(bucket.tokens[field], total(bucket.tokens)),
        })),
      ],
    }))

  return {
    models,
    cost: models.reduce((sum, model) => sum + model.cost, 0),
    surcharge,
    context: contextOf(api, sessionID),
  }
}
