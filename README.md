# opencode-usage-plugin

A sidebar panel for the [opencode](https://opencode.ai) TUI that shows the token
usage and cost of the current session.

```
Context
16,150 tokens     2%
input           240  0%
output           88  0%
reasoning       206  0%
cache read   15,616  2%
$0.00 spent
```

Each row is right-aligned into a value column with its share of the model's
context window. All five counters are shown, including the ones a turn reports
as zero, so the rows keep a stable order.

## Requirements

- opencode `>= 1.18.0`

The plugin is a TUI plugin: it imports from `@opencode-ai/plugin/tui` and renders
into the `sidebar_content` slot at order `100`, the same slot the built-in
context panel uses.

## Install

### From a file

Copy `tui.tsx` into your opencode plugin directory and register it in
`tui.json`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./plugins/tui.tsx"]
}
```

Then disable the built-in panel so the two do not stack:

```jsonc
{
  "plugin_enabled": {
    "internal:sidebar-context": false
  }
}
```

Relative paths in `tui.json` resolve from the config file that declares them, so
`./plugins/tui.tsx` means `~/.config/opencode/plugins/tui.tsx` for a global
config.

### As a package

The package exposes a `./tui` entrypoint, so it can be configured by spec:

```jsonc
{
  "plugin": ["opencode-usage-plugin"]
}
```

Install it into the config scope with `opencode plugin opencode-usage-plugin`
(add `--global` for the global config).

## How it reads usage

The panel takes the most recent assistant message that produced output and sums
its `input`, `output`, `reasoning`, `cache.read`, and `cache.write` token
counters reported by the provider. The percentage is each count against the
model's context limit; cost is the session total that opencode tracks.

## License

MIT — see [LICENSE](LICENSE).
