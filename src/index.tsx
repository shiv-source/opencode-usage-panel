import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import { tui } from "./plugin"

const plugin: TuiPluginModule & { id: string } = { id: "opencode-usage-panel", tui }

export default plugin
