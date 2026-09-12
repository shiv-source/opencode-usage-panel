/** @jsxImportSource @opentui/solid */
import type { TuiPlugin } from "@opencode-ai/plugin/tui"
import { View } from "./view"

export const tui: TuiPlugin = async (api, options) => {
  api.slots.register({
    order: 100,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} sessionID={props.session_id} options={options} />
      },
    },
  })
}
