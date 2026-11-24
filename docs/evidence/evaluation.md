# Fresh-session evaluation (synthetic)

Both arms use the same deterministic responder and the same prompts. The baseline has the same static manual artifact but no learned fix. The treatment retrieves the technician-approved fix from Meko shared knowledge. Evidence was captured 2026-11-24T17:00:28.969Z.

## Summary

- Baseline: correct 8/8; recommended 0; incorrect recommendations 0; questions 0; withheld 0; no-fix 8; MCP calls 32; latency mean 943 ms / p50 770 ms / p95 2108 ms; tokens not exposed.
- Treatment: correct 8/8; recommended 2; incorrect recommendations 0; questions 1; withheld 5; no-fix 0; MCP calls 30; latency mean 898 ms / p50 1039 ms / p95 1118 ms; tokens not exposed.

Sample size: 16 decisions. All sessions distinct: yes.

## Per-case results

| Scenario | Arm | Expected | Observed | Correct | Retrieved | Stale | Latency (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exact_match | baseline | no_fix | no_fix | yes | — | no | 2108 |
| exact_match | treatment | recommended | recommended | yes | fix-p100-fuser-001 v1 | no | 1118 |
| missing_firmware | baseline | no_fix | no_fix | yes | — | no | 831 |
| missing_firmware | treatment | question | question | yes | fix-p100-fuser-001 v1 | no | 1025 |
| firmware_mismatch | baseline | no_fix | no_fix | yes | — | no | 767 |
| firmware_mismatch | treatment | withheld | withheld | yes | fix-p100-fuser-001 v1 | no | 1090 |
| different_model | baseline | no_fix | no_fix | yes | — | no | 757 |
| different_model | treatment | withheld | withheld | yes | fix-p100-fuser-001 v1 | no | 1067 |
| withdrawn_live | baseline | no_fix | no_fix | yes | — | no | 755 |
| withdrawn_live | treatment | withheld | withheld | yes | fix-p109-cutter-002 v1 | no | 1019 |
| withdrawn_delayed_index | baseline | no_fix | no_fix | yes | — | no | 767 |
| withdrawn_delayed_index | treatment | withheld | withheld | yes | fix-p109-cutter-002 v1 | yes | 413 |
| superseded_stale | baseline | no_fix | no_fix | yes | — | no | 788 |
| superseded_stale | treatment | withheld | withheld | yes | fix-p100-roller-003 v1 | yes | 416 |
| superseded_live | baseline | no_fix | no_fix | yes | — | no | 770 |
| superseded_live | treatment | recommended | recommended | yes | fix-p100-roller-003 v2 | no | 1039 |

## Control checks

- Exact match recommended: pass
- Missing firmware asked: pass
- Withdrawn fix stayed withheld on live retrieval: pass
- Delayed indexing stayed withheld: pass
- Superseded version stayed withheld: pass
- Duplicate approval rejected with one approval event: pass

Duplicate approval detail: {"fixId":"fix-p100-fuser-001","attempts":["attempt 1: fix-p100-fuser-001 v1 is already approved.","attempt 2: fix-p100-fuser-001 v1 is already approved."],"bothRejected":true,"approvalEventCount":1,"singleApprovalEvent":true,"finalStatus":"approved"}

## Limitations

- Synthetic fixtures only; results establish behavior for these cases, not field accuracy.
- The hosted MCP endpoint is stateless per request; a fresh session is a separate initialize plus a separate conversation container.
- Meko cannot un-promote or mutate a promoted collective memory through the verified API, so the canonical control store is authoritative for status.
- Token counts are not exposed in this configuration; the deterministic responder makes no model call.
- Live retrieval after withdrawal still returned the approved snapshot in this fixture set; the canonical status withheld it.
