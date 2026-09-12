import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { Config, Cost, Counts, RateFields, Rates } from "./types"

const KEYS: Array<keyof Counts> = ["input", "output", "reasoning", "cacheRead"]

function pick(value: RateFields | undefined): RateFields {
  const out: RateFields = {}
  if (!value) return out
  for (const field of KEYS) {
    const rate = value[field]
    if (typeof rate === "number") out[field] = rate
  }
  return out
}

export function ratesFor(
  api: TuiPluginApi,
  providerID: string,
  modelID: string,
  config: Config,
): { off: Rates; peak: Rates | undefined; name: string; explicit: boolean } {
  const model = api.state.provider.find((item) => item.id === providerID)?.models[modelID]
  const cost = model?.cost as Cost | undefined
  const base: Rates = {
    input: cost?.input ?? 0,
    output: cost?.output ?? 0,
    reasoning: cost?.reasoning ?? cost?.output ?? 0,
    cacheRead: cost?.cacheRead ?? cost?.cache?.read ?? 0,
  }

  const entry = config.pricing[`${providerID}/${modelID}`] ?? config.pricing[modelID]
  const flat = pick(entry)
  const off: Rates = {
    input: flat.input ?? base.input,
    output: flat.output ?? base.output,
    reasoning: flat.reasoning ?? flat.output ?? base.reasoning,
    cacheRead: flat.cacheRead ?? base.cacheRead,
  }

  const above = pick(entry?.peak)
  const peak: Rates | undefined = entry?.peak
    ? {
        input: above.input ?? off.input,
        output: above.output ?? off.output,
        reasoning: above.reasoning ?? above.output ?? off.reasoning,
        cacheRead: above.cacheRead ?? off.cacheRead,
      }
    : undefined

  return { off, peak, name: model?.name ?? modelID, explicit: entry !== undefined }
}

export function costOf(value: Counts, rates: Rates): number {
  return (
    (value.input * rates.input +
      value.output * rates.output +
      value.reasoning * rates.reasoning +
      value.cacheRead * rates.cacheRead) /
    1_000_000
  )
}
