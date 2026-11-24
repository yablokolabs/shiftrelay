# Evidence index

All files are synthetic and sanitized. No API keys, emails or owner identity.

| File | Proves |
| --- | --- |
| `docs/evidence/m0-smoke.json` | Two independent MCP sessions; session B retrieved a memory and the exact artifact written by session A. Local SHA-256 matched Meko's content hash. |
| `docs/evidence/meko-capabilities.json` | `memory_promote` moved a proposal into shared knowledge; a fresh session found it with `knowledgebase_search`; `context_search` did not surface it in that run. |
| `docs/evidence/seed.json` | Project and datapack setup, 8 cases, 4 approved/superseded/withdrawn fix versions plus 1 proposed, baseline arm has no fix, treatment arm does. |
| `docs/evidence/retrieval-snapshots.json` | Pre-withdrawal and pre-supersession retrieval references used to test delayed indexing. |
| `docs/evidence/reconcile.json` | Canonical shared-memory ids reconciled to the rows Meko actually indexes. |
| `docs/evidence/evaluation.json` | Full 16-decision evaluation, per-case checks, metrics and assertions. |
| `docs/evidence/evaluation.md` | Human-readable evaluation tables and limitations. |
| `docs/evidence/decisions/*.json` | Individual decision traces with distinct session/conversation ids, retrieval source, canonical status and final checks. |
| `docs/CHECKPOINTS.md` | SHA-256 hashes of sanitized checkpoints uploaded to the Meko project bank. |

## What the evidence does not claim

- No field accuracy; fixtures are synthetic.
- No direct YugabyteDB access.
- No token counts.
- No guarantee that a withdrawn shared memory disappears from retrieval. The opposite was observed, and the canonical gate is what withholds it.
