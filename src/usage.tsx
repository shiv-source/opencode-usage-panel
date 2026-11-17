import type { SessionMessageAssistant, SessionMessageInfo, TokenUsageInfo } from "@opencode/client"
import type { Context } from "@opencode/plugin/tui/context"
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

function counts(tokens: TokenUsageInfo): Counts {
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

function isAssistantWithOutput(
  m: SessionMessageInfo,
): m is SessionMessageAssistant & { tokens: NonNullable<SessionMessageAssistant["tokens"]> } {
  return m.type === "assistant" && (m.tokens?.output ?? 0) > 0
}

function contextOf(context: Context, sessionID: string): { tokens: number; percent: number | null } {
  const last = context.data.session.message.list(sessionID).findLast(isAssistantWithOutput)
  if (!last) return { tokens: 0, percent: null }
  const tokens =
    last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
  const location = context.location ?? context.data.location.default()
  const models = context.data.location.model.list(location) ?? []
  const model = models.find((item) => item.providerID === last.model.providerID && item.modelID === last.model.id)
  return { tokens, percent: model?.limit.context ? Math.round((tokens / model.limit.context) * 100) : null }
}

export function read(
  context: Context,
  sessionID: string,
  options: Record<string, unknown> | undefined,
): {
  models: Usage[]
  cost: number
  surcharge: number
  hasPeak: boolean
  context: { tokens: number; percent: number | null }
} {
  const config = readConfig(options)
  const buckets = new Map<string, Bucket>()
  let surcharge = 0

  for (const message of context.data.session.message.list(sessionID)) {
    if (message.type !== "assistant") continue
    if (!message.tokens) continue
    const value = counts(message.tokens)
    if (total(value) === 0) continue

    const key = `${message.model.providerID}/${message.model.id}`
    let bucket = buckets.get(key)
    if (!bucket) {
      const info = ratesFor(context, message.model.providerID, message.model.id, config)
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
      bucket.cost += message.cost ?? 0
    }

    if (bucket.explicit || (message.cost ?? 0) > 0) bucket.known = true
  }

  const models = [...buckets.values()]
    .sort((a, b) => b.cost - a.cost || total(b.tokens) - total(a.tokens))
    .map<Usage>((bucket) => ({
      key: bucket.key,
      name: bucket.name,
      known: bucket.known,
      peak: bucket.peak !== undefined,
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
    hasPeak: models.some((model) => model.peak),
    context: contextOf(context, sessionID),
  }
}
