# Fresh-session evaluation

Last run: **2026-11-24T17:00:28Z**. Frozen synthetic fixtures only.

Reproduce with:

```bash
npm run seed   # idempotent
npm run eval   # rewrites docs/evidence/evaluation.{json,md}
```

## Design

- **Fixture set:** 8 synthetic cases and 5 fix records in `fixtures/cases.json` and `fixtures/fixes.json`. Seven cases participate in the evaluation; `case-008-p109-cover` and its proposed fix exist so the approval queue has a live pending item and are outside the scored scenarios.
- **Baseline arm:** datapack `shiftrelay-baseline`, same static manual artifact, no learned fix.
- **Treatment arm:** primary datapack `shiftrelay`, technician-approved fix promoted into shared knowledge.
- **Retrieval:** `knowledgebase_search` over Meko shared knowledge. Only chunks marked `SHIFTRELAY_FIX` by this app are considered.
- **Decisioning:** pure deterministic function in `shared/applicability.ts`. Status and current version come from the canonical control store, never from retrieved text.
- **Sessions:** each decision uses a new MCP `initialize` and a new Meko conversation. All 16 session ids were distinct.
- **Model:** both arms use `deterministic-rules-v1`. No external model key was used, so token counts are not available.

## Results

Sample size: **16 decisions** (8 scenarios × 2 arms).

| Arm | Correct | Recommended | Incorrect recommendations | Questions | Withheld | No fix | MCP calls | Latency mean / p50 / p95 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | 8/8 | 0 | 0 | 0 | 0 | 8 | 32 | 943 / 770 / 2108 ms |
| Treatment | 8/8 | 2 | 0 | 1 | 5 | 0 | 30 | 898 / 1039 / 1118 ms |

Treatment latency is bimodal: live-retrieval scenarios take about 1.0 s and 4 MCP calls; stale-snapshot scenarios replay a prior retrieval, take about 0.4 s and 3 MCP calls. The mean is below the p50 because of that split.

### Per-case

| Scenario | Arm | Expected | Observed | Retrieved | Stale | Correct |
| --- | --- | --- | --- | --- | --- | --- |
| Exact match | baseline | `no_fix` | `no_fix` | — | no | yes |
| Exact match | treatment | `recommended` | `recommended` | `fix-p100-fuser-001` v1 | no | yes |
| Missing firmware | baseline | `no_fix` | `no_fix` | — | no | yes |
| Missing firmware | treatment | `question` | `question` | `fix-p100-fuser-001` v1 | no | yes |
| Firmware mismatch | baseline | `no_fix` | `no_fix` | — | no | yes |
| Firmware mismatch | treatment | `withheld` | `withheld` | `fix-p100-fuser-001` v1 | no | yes |
| Different model | baseline | `no_fix` | `no_fix` | — | no | yes |
| Different model | treatment | `withheld` | `withheld` | `fix-p100-fuser-001` v1 | no | yes |
| Withdrawn live | baseline | `no_fix` | `no_fix` | — | no | yes |
| Withdrawn live | treatment | `withheld` | `withheld` | `fix-p109-cutter-002` v1 | no | yes |
| Withdrawn delayed index | baseline | `no_fix` | `no_fix` | — | no | yes |
| Withdrawn delayed index | treatment | `withheld` | `withheld` | `fix-p109-cutter-002` v1 | **yes** | yes |
| Superseded stale | baseline | `no_fix` | `no_fix` | — | no | yes |
| Superseded stale | treatment | `withheld` | `withheld` | `fix-p100-roller-003` v1 | **yes** | yes |
| Superseded live | baseline | `no_fix` | `no_fix` | — | no | yes |
| Superseded live | treatment | `recommended` | `recommended` | `fix-p100-roller-003` v2 | no | yes |

### Control checks

All **7/7** passed:

- exact match recommended
- missing firmware asked
- withdrawn fix stayed withheld on live retrieval
- delayed indexing stayed withheld and flagged stale
- superseded version stayed withheld
- duplicate approval rejected, with one approval event
- all sessions distinct

Duplicate approval detail: two attempts on the already-approved primary fix were both rejected with `fix-p100-fuser-001 v1 is already approved.` The event log contains exactly one `fix.approved` event.

## Negative results and limitations

- **Live withdrawal retrieval:** Meko still returned the promoted approved snapshot after withdrawal. This is expected because the API has no un-promote operation. The canonical status withheld it. This is a demonstrated failure mode of relying on retrieval alone, not a hidden success.
- **Delayed indexing:** The pre-withdrawal and pre-supersession snapshots were replayed after the canonical change. Both were withheld and marked `staleRetrieval: true`.
- **Synthetic scope:** these results establish behavior on the frozen fixture set, not field accuracy.
- **Stateless MCP:** "session" means separate initialize and conversation container, not a server-held session object.
- **Tokens:** not exposed. The deterministic responder makes no model call.
- **Baseline correctness:** the baseline is intentionally unable to reuse the learned fix. Its 8/8 "correct" count means it produced `no_fix` in all eight scenarios, matching the baseline expectation, not that it solved the cases.

Sanitized evidence:

- `docs/evidence/evaluation.json`
- `docs/evidence/evaluation.md`
- `docs/evidence/decisions/` (per-decision JSON)
- `docs/evidence/retrieval-snapshots.json`
- `docs/evidence/seed.json`
