# Unsupported or unverified surfaces

These are recorded separately from the supported path so the demo does not imply guarantees the API does not provide.

| Capability | Status | Workaround used |
| --- | --- | --- |
| Un-promote or mutate a promoted collective memory | **Not exposed** by the verified MCP/REST surface | Canonical status and version live in the app-owned control store; the stale shared snapshot may remain retrievable |
| Update a knowledge-base document in place | **Not exposed**; upload or delete only | Artifacts hold immutable fix snapshots; the canonical record holds current status |
| List artifacts or query artifact metadata | **Not exposed**; retrieval requires the SHA-256 content hash | The app records hashes in the canonical record and evidence |
| Mutable artifact status | **Not supported**; artifacts are content-addressed and immutable | New artifact per approval/withdrawal event |
| Direct YugabyteDB / YSQL access | **Not exposed** to this API key; connection fields are empty | All data operations go through Meko |
| Server-side MCP session object | **Not observed**; the endpoint behaved statelessly | A fresh session = new `initialize` + new conversation container |
| Relevance score contract / threshold | **Not documented as stable**; scores are returned as data | The UI shows `distance` and `rerank_score` exactly as exposed, without treating them as approval |
| Token counts from MCP tool calls | **Not exposed** in observed responses | Evaluation records `tokens: null` and states this limitation |
| `context_search` surfacing promoted memories | **Inconsistent** in the promotion probe | The app uses `knowledgebase_search`, which did return the promoted memory |
| Un-promote after technician withdrawal | **Not supported** | Withdrawal event is written as a memory and artifact, while canonical status blocks recommendation |
| Delete a datapack and recover the creation slot | **Not supported** per docs | The seed is idempotent and avoids delete/recreate loops |

## Consequence for the demo

The canonical control store is deliberate, documented control metadata. It is not a claim that Meko's labels or metadata filters enforce sharing or withdrawal. The evaluation demonstrates the exact failure mode: after withdrawal, live retrieval still returned the approved snapshot, and the deterministic gate withheld it.
