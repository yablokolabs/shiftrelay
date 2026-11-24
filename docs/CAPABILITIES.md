# Verified Meko capabilities

Checked 2026-11-24 against current official documentation and the live hosted service. Evidence files contain only synthetic data and sanitized identifiers.

## Contract

| Surface | Value | How verified |
| --- | --- | --- |
| MCP endpoint | `https://mcp.mekodata.ai/mcp` | `initialize` returned HTTP 200 and `serverInfo.name = "Meko MCP"`, version `3.2.4` |
| MCP protocol | `2025-06-18`, Streamable HTTP | `initialize` response |
| Tool discovery | 57 tools | `tools/list` |
| REST base | `https://api.mekodata.ai/api/v1` | `GET /health` returned `{"status":"ok","database":"ok"}` |
| Datapack | `shiftrelay` (`f28dc489-57a2-4b04-aab0-5d6689cba714`) | `GET /datapacks`, `datapack_describe` |
| Project | `ShiftRelay` with `Field knowledge` and `Evaluation` folders | `project_create`, `project_add_datapack` |
| Baseline datapack | `shiftrelay-baseline` | created by `npm run seed` |
| Authentication | `Authorization: Bearer mko_tkn_…` plus `User-Agent` | live calls; key supplied through gitignored `.env` |

The MCP endpoint behaved statelessly: no session identifier was required across calls, and a fresh `initialize` cycle was enough to start an independent session.

## Operations observed to work

| Operation | Observed result |
| --- | --- |
| `conversation_create` | Returned a 32-hex conversation id per agent namespace |
| `conversation_add_message` | Stored the synthetic intake turn; returned without waiting for memory extraction |
| `memory_add` | Returned `{results:[{id,...}]}`; direct memory write is synchronous |
| `memory_search` | Retrieved the intake memory from a different session (M0) |
| `memory_promote` | Returned `inserted_ids`; the promoted snapshot became discoverable through `knowledgebase_search` from a fresh session |
| `knowledgebase_search` | Returned promoted memory chunks with `metadata_filters.source = "memory"`, `metadata_filters.memory_id`, `distance`, `rerank_score` and `match_type` |
| `artifact_put` (REST `POST /artifacts`) | Returned a content hash matching the local SHA-256 |
| `artifact_get` | Retrieved the exact artifact bytes from a fresh session |
| `datapack_describe` | Returned project path `ShiftRelay/Field knowledge`, memory and collective-memory counts |
| `datapack_list` / `datapack_create` | Used by the seed script; create is idempotent by existing-name check |
| REST `GET /health`, `GET /datapacks`, `POST /artifacts` | Used directly by the adapter |

## Real cross-session proof

M0 smoke test (`npm run smoke`, evidence `docs/evidence/m0-smoke.json`):

- Session A, agent `shiftrelay:intake`, conversation `9d87fd210f92e980ff2f0cc8e8d2d05b`, wrote a case memory (`4c80736b-cd79-4fe9-bd03-78e0aa8c3b6c`) and an artifact.
- Session B, agent `shiftrelay:next-shift`, conversation `7beaf1e2c2a4ce18c57ed7b3bf5de316`, performed a separate MCP initialize and retrieved both the memory (`memory_search`) and artifact (`artifact_get`).
- Local SHA-256 matched Meko's `content_hash`. Result: **PASS**.

Promotion probe (`docs/evidence/meko-capabilities.json`):

- Private memory was promoted with `memory_promote` (`inserted_ids` contained the memory id).
- A fresh session found it with `knowledgebase_search`.
- `context_search` did not surface the promoted memory in that run. Recorded as an observed limitation; the app uses `knowledgebase_search`.

Approval path used by the app:

1. Create a private approved-snapshot memory with `memory_add`.
2. Promote it with `memory_promote`, retrying while indexing settles.
3. Verify the shared row is discoverable; abort approval if promotion is not confirmed.
4. Commit the canonical approval with an expected-revision check.
5. Store an immutable fix artifact.
6. Add an approval-event memory for traceability.

## YugabyteDB-backed operations

Meko is the persistence layer and describes its own store as YugabyteDB-backed. ShiftRelay exercises those operations through Meko:

- conversations and messages
- private memories and shared collective memories
- knowledge-base search over promoted memories
- content-addressed artifacts
- datapack/project metadata

`datapack_describe` returned empty `universe_id`, `datapack_ysql_connection_string` and `datapack_ysql_username` fields. No direct YSQL connection was available or used. Therefore the project describes YugabyteDB as **Meko's foundation accessed indirectly**, not as a database ShiftRelay connects to.

## Quota and safety observations

- Free-tier counters observed in the portal: datapacks, conversations, memory searches, KB searches, memory adds and KB storage. This build avoids knowledge-base file uploads; it uses artifacts and memories, so KB file storage stayed at 0 B.
- The app refuses to checkpoint `.env` files and sanitizes evidence before writing.
- `datapack_describe` returns owner identity. The sanitizer strips the owner name and any email before evidence is stored or exported.
- API keys are read server-side from `.env` or the process environment. No key is sent to the browser.
