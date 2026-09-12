/** @jsxImportSource @opentui/solid */
import { createMemo, createSignal, onCleanup } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { isPeak, peakWindow, readConfig } from "./config"
import { formatClock, formatCost, timezoneLabel, utcOffsetMinutes } from "./format"
import { read } from "./usage"
import type { Window } from "./types"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type TimerApi = {
  setInterval: (handler: () => void, timeout: number) => unknown
  clearInterval: (handle: unknown) => void
}

const timers = globalThis as unknown as TimerApi

function daysLabel(days: Set<number> | undefined): string {
  if (!days || days.size === 0 || days.size === 7) return "daily"
  if (days.size === 5 && [1, 2, 3, 4, 5].every((day) => days.has(day))) return "weekdays"
  if (days.size === 2 && days.has(0) && days.has(6)) return "weekends"
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => DAY_NAMES[day])
    .join(",")
}

function localDays(window: Window, offset: number): Set<number> | undefined {
  if (!window.days) return undefined
  const span = window.start > window.end ? 1440 : 0
  const first = Math.floor((window.start + offset) / 1440)
  const last = Math.floor((window.end + span + offset - 1) / 1440)
  const wrap = (day: number) => ((day % 7) + 7) % 7
  const days = new Set<number>()
  for (const day of window.days) {
    for (let shift = first; shift <= last; shift++) days.add(wrap(day + shift))
  }
  return days
}

export function View(props: { api: TuiPluginApi; sessionID: string; options: Record<string, unknown> | undefined }) {
  const [now, setNow] = createSignal(Date.now())
  if (readConfig(props.options).windows.length > 0) {
    const timer = timers.setInterval(() => setNow(Date.now()), 60_000)
    onCleanup(() => timers.clearInterval(timer))
  }

  const theme = () => props.api.theme.current
  const config = createMemo(() => readConfig(props.options))
  const state = createMemo(() => read(props.api, props.sessionID, props.options))
  const peakNow = createMemo(() => isPeak(config(), now()))
  const activePeak = createMemo(() => peakWindow(config(), now()))
  const peakPriced = createMemo(() => state().hasPeak && config().windows.length > 0)
  const offset = createMemo(() => (config().timezone === "utc" ? 0 : utcOffsetMinutes(now())))
  const zone = createMemo(() => (config().timezone === "utc" ? "UTC" : timezoneLabel(now())))

  const valueWidth = createMemo(() =>
    Math.max(
      0,
      ...state().models.flatMap((model) => model.rows.map((row) => row.value.toLocaleString().length)),
    ),
  )
  const percentWidth = createMemo(() =>
    Math.max(0, ...state().models.flatMap((model) => model.rows.map((row) => row.percent.length))),
  )

  const range = (window: Window) => {
    const clock = (minutes: number) => {
      const value = minutes + offset()
      return value % 60 === 0 ? formatClock(value).slice(0, 2) : formatClock(value)
    }
    return `${clock(window.start)}-${clock(window.end)}`
  }
  const schedule = createMemo(() => {
    const groups = new Map<string, string[]>()
    for (const window of config().windows) {
      const label = daysLabel(localDays(window, offset()))
      const ranges = groups.get(label) ?? []
      ranges.push(range(window))
      groups.set(label, ranges)
    }
    const parts = [...groups.entries()].map(([label, ranges]) => `${ranges.join(", ")} ${label}`)
    return `peak ${parts.join("; ")} ${zone()}`
  })

  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row" justifyContent="space-between" width="100%">
        <text fg={theme().text}>
          <b>Tokens Usage</b>
        </text>
        {peakPriced() && (
          <text fg={peakNow() ? theme().warning : theme().success}>{peakNow() ? "▲ peak" : "off-peak"}</text>
        )}
      </box>
      <box flexDirection="column" width="100%" marginTop={1}>
        <text fg={theme().textMuted}>Context</text>
        <box flexDirection="row" justifyContent="space-between" width="100%">
          <text fg={theme().text}>{state().context.tokens.toLocaleString()} tokens</text>
          <text fg={theme().textMuted}>{state().context.percent ?? 0}% used</text>
        </box>
      </box>
      {state().models.map((model) => (
        <box flexDirection="column" width="100%" marginTop={1}>
          <box flexDirection="row" justifyContent="space-between" width="100%">
            <text fg={theme().primary}>
              <b>{model.name}</b>
            </text>
            <box flexDirection="row" gap={1}>
              {model.peak && peakNow() && <text fg={theme().warning}>▲ peak</text>}
              <text fg={model.known ? theme().text : theme().textMuted}>
                {model.known ? formatCost(model.cost) : "—"}
              </text>
            </box>
          </box>
          {model.rows.map((row) => (
            <box flexDirection="row" justifyContent="space-between" width="100%">
              <text fg={theme().textMuted}>{"  " + row.label}</text>
              <box flexDirection="row" gap={1}>
                <text fg={theme().text}>{row.value.toLocaleString().padStart(valueWidth())}</text>
                <text fg={theme().textMuted}>{row.percent.padStart(percentWidth())}</text>
              </box>
            </box>
          ))}
        </box>
      ))}
      <box
        flexDirection="column"
        width="100%"
        marginTop={1}
        border={["top"]}
        borderStyle="single"
        borderColor={theme().borderSubtle}
      >
        <box flexDirection="row" justifyContent="space-between" width="100%">
          <text fg={theme().text}>
            <b>Spent</b>
          </text>
          <text fg={theme().text}>
            <b>{formatCost(state().cost)}</b>
          </text>
        </box>
        {state().surcharge > 0 && (
          <box flexDirection="row" justifyContent="space-between" width="100%">
            <text fg={theme().textMuted}>peak surcharge</text>
            <text fg={theme().warning}>+{formatCost(state().surcharge)}</text>
          </box>
        )}
      </box>
      {peakPriced() && (
        <text fg={peakNow() ? theme().warning : theme().textMuted}>
          {peakNow()
            ? `▲ peak hours until ${formatClock((activePeak()?.end ?? 0) + offset())} ${zone()}`
            : schedule()}
        </text>
      )}
    </box>
  )
}
