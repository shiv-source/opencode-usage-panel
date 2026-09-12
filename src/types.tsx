export type Counts = {
  input: number
  output: number
  reasoning: number
  cacheRead: number
}

export type Rates = Counts

export type RateFields = Partial<Counts>

export type ModelPrice = RateFields & {
  peak?: RateFields
}

export type Window = {
  start: number
  end: number
  days: Set<number> | undefined
}

export type Config = {
  pricing: Record<string, ModelPrice>
  windows: Window[]
  timezone: "local" | "utc"
}

export type Row = {
  label: string
  value: number
  percent: string
}

export type Usage = {
  key: string
  name: string
  known: boolean
  peak: boolean
  cost: number
  tokens: number
  rows: Row[]
}

export type Bucket = {
  key: string
  name: string
  explicit: boolean
  known: boolean
  off: Rates
  peak: Rates | undefined
  tokens: Counts
  cost: number
}

export type Cost = {
  input: number
  output: number
  reasoning?: number
  cacheRead?: number
  cache?: { read: number; write: number }
}
