import type { Config, ModelPrice, Window } from "./types"

const DAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

function parseClock(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return fallback
  return Number(match[1]) * 60 + Number(match[2])
}

function parseDays(value: unknown): Set<number> | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const days = new Set<number>()
  for (const item of value) {
    if (typeof item === "number" && item >= 0 && item <= 6) days.add(item)
    else if (typeof item === "string" && DAYS[item.trim().slice(0, 3).toLowerCase()] !== undefined) {
      days.add(DAYS[item.trim().slice(0, 3).toLowerCase()])
    }
  }
  return days.size > 0 ? days : undefined
}

export function readConfig(options: Record<string, unknown> | undefined): Config {
  const raw = (options ?? {}) as { pricing?: Record<string, ModelPrice>; peakHours?: unknown }
  const pricing = raw.pricing ?? {}
  const windows: Window[] = Array.isArray(raw.peakHours)
    ? raw.peakHours.map((item) => {
        const window = (item ?? {}) as { start?: unknown; end?: unknown; days?: unknown }
        return {
          start: parseClock(window.start, 0),
          end: parseClock(window.end, 0),
          days: parseDays(window.days),
        }
      })
    : []
  return { pricing, windows }
}

const MINUTE = 60_000
const DAY = 86_400_000

function utcDay(time: number): number {
  return (Math.floor(time / DAY) + 4) % 7
}

function utcMinutes(time: number): number {
  return Math.floor((((time % DAY) + DAY) % DAY) / MINUTE)
}

export function isPeak(config: Config, time: number): boolean {
  if (config.windows.length === 0) return false
  const day = utcDay(time)
  const minutes = utcMinutes(time)
  return config.windows.some((window) => {
    if (window.days && !window.days.has(day)) return false
    return window.start <= window.end
      ? minutes >= window.start && minutes < window.end
      : minutes >= window.start || minutes < window.end
  })
}
