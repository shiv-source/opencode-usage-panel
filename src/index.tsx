import type { TuiPluginModule } from "@opencode-ai/plugin/tui"
import { tui } from "./plugin"

const plugin: TuiPluginModule & { id: string } = { id: "opencode-usage-plugin", tui }

export default plugin
