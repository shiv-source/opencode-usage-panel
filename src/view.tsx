/** @jsxImportSource @opentui/solid */
import { createMemo } from "solid-js"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { formatCost } from "./format"
import { read } from "./usage"

export function View(props: { api: TuiPluginApi; sessionID: string; options: Record<string, unknown> | undefined }) {
  const theme = () => props.api.theme.current
  const state = createMemo(() => read(props.api, props.sessionID, props.options))
  const valueWidth = createMemo(() =>
    Math.max(
      0,
      ...state().models.flatMap((model) => model.rows.map((row) => row.value.toLocaleString().length)),
    ),
  )
  const percentWidth = createMemo(() =>
    Math.max(0, ...state().models.flatMap((model) => model.rows.map((row) => row.percent.length))),
  )

  return (
    <box flexDirection="column" width="100%">
      <box flexDirection="row" justifyContent="space-between" width="100%">
        <text fg={theme().text}>
          <b>Tokens Usage</b>
        </text>
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
            <text fg={model.known ? theme().text : theme().textMuted}>
              {model.known ? formatCost(model.cost) : "—"}
            </text>
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
    </box>
  )
}
