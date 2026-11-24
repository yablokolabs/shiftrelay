# Progress

## M0 — Meko smoke test (complete)

Date: 2026-11-24 · Commit: `7f94a0a`

- MCP `https://mcp.mekodata.ai/mcp`, protocol `2025-06-18`, `Meko MCP 3.2.4`, **57 tools** discovered.
- REST `https://api.mekodata.ai/api/v1`; `GET /health` returned `status: ok`.
- Datapack `shiftrelay` created and filed in the Meko **ShiftRelay** project.
- Session A (`shiftrelay:intake`, conversation `9d87fd210f92e980ff2f0cc8e8d2d05b`) captured a synthetic case, memory `4c80736b-cd79-4fe9-bd03-78e0aa8c3b6c`, and an artifact.
- Session B (`shiftrelay:next-shift`, conversation `7beaf1e2c2a4ce18c57ed7b3bf5de316`) performed a separate initialize and retrieved both the memory (`memory_search`) and exact artifact (`artifact_get`). Local SHA-256 matched Meko's `content_hash`.
- Result: **PASS**. Evidence: `docs/evidence/m0-smoke.json`.

Limitations: synthetic data; MCP is stateless per request, so a session is a separate initialize + conversation; memory extraction is asynchronous, so the smoke test uses direct `memory_add`.

## M1 — approved memory and fresh recall (complete)

Date: 2026-11-24 · Commit: `0e70730`

- Built the Node Meko adapter (MCP + REST), typed control store, React console and seed flow.
- Created Meko project **ShiftRelay** with **Field knowledge** and **Evaluation** folders; primary and baseline datapacks are filed.
- Seven synthetic cases captured as Meko conversations plus case memories.
- Four fix versions seeded: primary fuser fix approved, cutter fix approved then withdrawn, roller v1 superseded by v2.
- Approval path: private approved-snapshot memory → `memory_promote` → canonical approval → fix artifact → approval-event memory.
- Observed: a fresh session retrieved the approved fuser fix with `knowledgebase_search` and recommended it. Baseline retrieved nothing.
- Canonical shared-memory ids were reconciled to the rows Meko actually indexes (`docs/evidence/reconcile.json`).
- Evidence: `docs/evidence/seed.json`, `docs/evidence/meko-capabilities.json`, `docs/evidence/decisions/`.

Limitation observed: `memory_promote` created a shared row with a different id; the canonical record must store the indexed row, not the proposal id. `context_search` did not surface the promoted memory in the probe; `knowledgebase_search` did.

## M2 — applicability and withdrawal (complete)

Date: 2026-11-24 · Commit: `0e70730`

- Pure typed gate in `shared/applicability.ts`: status → current version → model → firmware → prerequisites.
- Missing firmware returns a question. Firmware/model mismatch, unapproved proposal, superseded version and missing prerequisites withhold.
- Withdrawal changes canonical status; retrieval may still return the approved snapshot.
- Expected-revision checks and a unique approval event reject duplicate approvals.
- Unit tests: 9 applicability cases + 1 control-store test, all passing.

## M3 — evaluation, demo and submission materials (complete)

Date: 2026-11-24 · Commit: `1971c54`

- Evaluation: 8 scenarios × 2 arms = **16 decisions**, all 16 sessions distinct.
- Treatment 8/8 correct, 2 recommended, 0 incorrect recommendations, 1 question, 5 withheld.
- Baseline 8/8 expected `no_fix`, 0 recommendations; MCP calls 32 baseline vs 30 treatment.
- All **7/7** control assertions pass: exact recommendation, missing-firmware question, live withdrawal withheld, delayed indexing withheld, superseded version withheld, duplicate approval rejected, distinct sessions.
- Evidence: `docs/evidence/evaluation.json`, `docs/evidence/evaluation.md`, `docs/EVIDENCE.md`.
- UI: intake, technician review, fresh-session decision trace, evidence panel. No decorative footer or powered-by strip.
- README diagram: hand-authored SVG (`docs/architecture.svg`); `diagram-design` was not available in this session.
- Demo: `docs/demo/shiftrelay-demo.mp4` (0:56, 1440×900, captioned) assembled from real Chromium captures with ffmpeg because VideoWright was not available. The recording includes a live approval that promoted the proposed P109 cover fix. Storyboard: `docs/DEMO.md`.
- Added `case-008-p109-cover` and a proposed P109 fix so the review queue has a live pending item for the demo; it is outside the scored evaluation scenarios.
- Sanitization: credentials, emails and owner identity removed from evidence. The owner identity found in `datapack_describe` is not reused anywhere.
- Project-bank checkpoints: sanitized `docs/PROGRESS.md` and evidence uploaded to the `shiftrelay` datapack as artifacts; hashes in `docs/CHECKPOINTS.md`.

### Observed results

See `docs/EVALUATION.md`. Negative results are preserved: live retrieval after withdrawal still returned the old snapshot; the canonical gate withheld it.

### Known limitations

- Direct YugabyteDB/YSQL access is not exposed to the API key; operations are demonstrated through Meko only.
- Meko cannot un-promote or mutate a promoted collective memory.
- Token counts are not exposed; both arms use the deterministic responder.
- Synthetic fixtures only.

### Next action

Prepare the public repository and under-five-minute video when the operator authorizes external publishing. Do not push or upload without that authorization.
