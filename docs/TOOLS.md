# Session tool discovery

Checked 2026-11-24 before building; updated 2026-11-25 for the diagram, deck and backstory pass.

| Tool or service | Status | What was used |
| --- | --- | --- |
| Meko MCP | **Configured and verified** | `mcp.mekodata.ai/mcp`, 57 tools, separate initialize cycles |
| Meko REST | **Configured and verified** | health, datapacks, artifacts |
| Meko Projects | **Verified** | project `ShiftRelay`, folders `Field knowledge` and `Evaluation` |
| Meko project bank | **Used** | sanitized milestone checkpoints uploaded as artifacts to the `shiftrelay` datapack |
| VideoWright | **Not available** in this session | No binary, MCP tool or skill found. A Remotion explainer and a genuine Chromium capture were produced instead |
| Remotion | **Available** via the supplied `remotion-video-skill` | Six-scene 1080p explainer with scene transitions and local narration |
| Piper TTS | **Available** locally after `uv tool install piper-tts` | `en_GB-jenny_dioco-medium` British female voice; no hosted API |
| diagram-design | **Available** at `/root/diagram-design` (v2.6) | Four HTML/SVG diagrams using the project palette. `self_check.py` and `verify_geometry.py` passed |
| Playwright | **Not installed locally** | The skill's PNG export helper was unavailable; PNGs were rasterized from SVG with headless Chromium instead |
| Chromium | **Available** at `/root/.hermes/tools/chromium-1248/chrome-linux64/chrome` | Headless screenshots, backstory slide renders, SVG-to-PNG at 1440×810, and 16:9 PDF deck export |
| ffmpeg | **Available** | UI capture assembly, combined 3:57 cut, backstory and architecture chapters, caption lower third, final H.264/AAC encode and audio level check |
| Local MCP server `jnaapakam` | Configured but unrelated | Not used |

No external model key was used. `MODEL_PROVIDER=deterministic`; the optional OpenRouter adapter stays disabled unless the operator supplies a key.

## Secrets

`MEKO_API_KEY` was supplied by the operator at `~/.hermes/.env` and copied into a gitignored project `.env` through an authorized shell command. The key is never printed in evidence, never sent to the browser and never committed. `docs/CHECKPOINTS.md` records artifact hashes only.
