/** @jsxImportSource @opentui/solid */
import { createMemo } from "solid-js"
import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

type Row = {
  label: string
  value: number
}

type Usage = {
  rows: Row[]
  total: number
  limit: number | undefined
}

function read(api: TuiPluginApi, sessionID: string): Usage {
  const messages = api.state.session.messages(sessionID)
  const last = messages.findLast(
    (item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0,
  )
  if (!last) return { rows: [], total: 0, limit: undefined }

  const model = api.state.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
  const rows: Row[] = [
    { label: "input", value: last.tokens.input },
    { label: "output", value: last.tokens.output },
    { label: "reasoning", value: last.tokens.reasoning },
    { label: "cache read", value: last.tokens.cache.read },
    { label: "cache write", value: last.tokens.cache.write },
  ]

  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return { rows, total, limit: model?.limit.context }
}

function View(props: { api: TuiPluginApi; sessionID: string }) {
  const theme = () => props.api.theme.current
  const state = createMemo(() => read(props.api, props.sessionID))
  const cost = createMemo(() => props.api.state.session.get(props.sessionID)?.cost ?? 0)

  const percent = (value: number) => {
    const limit = state().limit
    if (!limit) return ""
    return `${Math.round((value / limit) * 100)}%`
  }
  const valueWidth = createMemo(() =>
    Math.max(0, ...state().rows.map((row) => row.value.toLocaleString().length)),
  )
  const percentWidth = createMemo(() =>
    Math.max(0, ...state().rows.map((row) => percent(row.value).length)),
  )

  return (
    <box flexDirection="column">
      <text fg={theme().text}>
        <b>Context</b>
      </text>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme().textMuted}>{state().total.toLocaleString()} tokens</text>
        <text fg={theme().textMuted}>{percent(state().total).padStart(percentWidth())}</text>
      </box>
      {state().rows.map((row) => (
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme().textMuted}>{row.label}</text>
          <box flexDirection="row" gap={1}>
            <text fg={theme().textMuted}>{row.value.toLocaleString().padStart(valueWidth())}</text>
            <text fg={theme().textMuted}>{percent(row.value).padStart(percentWidth())}</text>
          </box>
        </box>
      ))}
      <text fg={theme().textMuted}>{money.format(cost())} spent</text>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} sessionID={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = { id: "token-usage", tui }

export default plugin
