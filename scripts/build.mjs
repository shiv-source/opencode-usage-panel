import { build } from "esbuild"
import { solidPlugin } from "esbuild-plugin-solid"

await build({
  entryPoints: ["src/index.tsx"],
  outfile: "dist/tui.js",
  format: "esm",
  platform: "node",
  bundle: true,
  target: "esnext",
  external: ["@opencode-ai/*", "@opentui/*", "solid-js", "solid-js/*"],
  plugins: [solidPlugin({ solid: { moduleName: "@opentui/solid", generate: "universal" } })],
  logLevel: "info",
})
