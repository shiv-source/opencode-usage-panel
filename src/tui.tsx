/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { UsagePanel } from "./view"

export default Plugin.define({
  id: "opencode-usage-panel",
  setup(context) {
    // Prime the model catalog for rate lookups; panel degrades to `?? []` until synced.
    const location = context.location ?? context.data.location.default()
    void context.data.location.model.sync(location).catch(() => {})
    return context.ui.slot({
      prepend: "sidebar.content",
      render: ({ sessionID }) => <UsagePanel sessionID={sessionID} />,
    })
  },
})
