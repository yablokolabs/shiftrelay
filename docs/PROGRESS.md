# Progress

## M0 — Meko smoke test (complete)

Date: 2026-11-24

Contract verified against current Meko documentation and live discovery:

- MCP endpoint `https://mcp.mekodata.ai/mcp`, protocol `2025-06-18`, Streamable HTTP. Initialization advertised `Meko MCP 3.2.4` and 57 tools.
- REST base `https://api.mekodata.ai/api/v1`; `GET /health` reported `status: ok`.
- Datapack `shiftrelay` created: `f28dc489-57a2-4b04-aab0-5d6689cba714` (owner).
- API key supplied through an authorized project `.env` (gitignored); no key is written to evidence or source.

Observed cross-session proof (`npm run smoke`):

- Session A (`shiftrelay:intake`, conversation `9d87fd210f92e980ff2f0cc8e8d2d05b`) captured a synthetic case with `conversation_create` + `conversation_add_message`, stored a proposed learning with `memory_add` (memory `4c80736b-cd79-4fe9-bd03-78e0aa8c3b6c`), and stored a sanitized case artifact with `POST /artifacts`.
- Session B (`shiftrelay:next-shift`, conversation `7beaf1e2c2a4ce18c57ed7b3bf5de316`) performed a separate MCP initialize and retrieved the memory with `memory_search` and the exact artifact with `artifact_get`. Local SHA-256 matched Meko's `content_hash`.
- Result: **PASS**. Sanitized evidence: `docs/evidence/m0-smoke.json`.

Limitations: synthetic data only; the hosted MCP endpoint is stateless per request, so "session" means a separate initialize cycle plus a separate conversation container; memory extraction is asynchronous and the smoke test uses direct `memory_add`.

Next: M1 — approval, shared-memory promotion and fresh-session recall.
