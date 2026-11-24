# Built with

Only technologies actually used and verified:

- **Meko Context Engine** — hosted MCP server (`mcp.mekodata.ai/mcp`, protocol 2025-06-18) and REST datapack API. Conversations, memories, shared knowledge via `memory_promote`, knowledge-base retrieval, artifacts and Projects were exercised live.
- **YugabyteDB** — Meko's persistence foundation. Accessed **indirectly through Meko**; the API key did not expose a YSQL connection string.
- **Model Context Protocol (MCP)** — Streamable HTTP, stateless per request in this deployment.
- **TypeScript** — shared typed domain model, MCP/REST adapter, deterministic applicability gate, control store and evaluation.
- **React 19 + Vite** — intake, technician review, fresh-session decision trace and evidence console.
- **Node.js + Express** — small server adapter; provider credentials stay server-side.
- **Zod** — request validation at the API boundary.
- **Node test runner via tsx** — deterministic unit tests for applicability and revision guards.
- **Chromium + ffmpeg** — headless visual checks and demo capture/assembly, if a video is produced.

Not used: external model APIs (no key supplied), S3 configuration, VideoWright (not available), diagram-design (not available).
