# Session tool discovery

Checked 2026-11-24 before building.

| Tool or service | Status | What was used |
| --- | --- | --- |
| Meko MCP | **Configured and verified** | `mcp.mekodata.ai/mcp`, 57 tools, separate initialize cycles |
| Meko REST | **Configured and verified** | health, datapacks, artifacts |
| Meko Projects | **Verified** | project `ShiftRelay`, folders `Field knowledge` and `Evaluation` |
| Meko project bank | **Used** | sanitized milestone checkpoints uploaded as artifacts to the `shiftrelay` datapack |
| VideoWright | **Not available** in this session | No binary, MCP tool or skill found. Demo storyboard prepared; ffmpeg can assemble genuine browser captures |
| diagram-design | **Not available** in this session | No such skill or tool found. README diagram authored as SVG using the local architecture-diagram design guidance |
| Playwright | **Not installed locally** | Chromium and ffmpeg were available through the session tooling for visual checks |
| Chromium | **Available** at `/root/.hermes/tools/chromium-1208/chrome-linux64/chrome` | Headless screenshots and CDP-driven UI checks |
| ffmpeg | **Available** | Available for demo assembly if needed |
| Local MCP server `jnaapakam` | Configured but unrelated | Not used |

No external model key was used. `MODEL_PROVIDER=deterministic`; the optional OpenRouter adapter stays disabled unless the operator supplies a key.

## Secrets

`MEKO_API_KEY` was supplied by the operator at `~/.hermes/.env` and copied into a gitignored project `.env` through an authorized shell command. The key is never printed in evidence, never sent to the browser and never committed. `docs/CHECKPOINTS.md` records artifact hashes only.
