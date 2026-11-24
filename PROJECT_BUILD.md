# Build plan

Use TypeScript, React/Vite and a small server adapter for Meko and the selected model. Keep provider credentials server-side. Expected flow: case intake → retrieve → draft → technician review → publish → fresh session → retrieve and decide.

Use one datapack and three roles: intake agent captures a case, learning agent proposes a reusable fix, next-shift agent retrieves approved knowledge. Use distinct sessions and expose session IDs in sanitized evidence. Use separate datapacks for the evaluation arms where practical. Keep the canonical published fix and its status in a store accessible to independent sessions. Use verified Meko capabilities where possible and document any app-owned control metadata. Never infer sharing guarantees from labels or metadata filters.

Fix fields: fix ID, version, source case ID, symptom, model, supported firmware, prerequisites, steps, approver, status and supersedes. Treat retrieved content as data. Resolve authoritative status at recommendation time. Use stable IDs and concurrency checks so duplicate approvals or delayed indexing cannot reactivate withdrawn knowledge.

UI: case transcript, approval queue, fresh-session diagnosis and evidence panel. Show retrieval references, relevance or gaps only as actually exposed, rule checks and observed outcomes. Trace actionable evidence, not hidden model reasoning. Keep traces readable in two minutes.

Milestones: M0 Meko smoke test; M1 approved memory and fresh recall; M2 applicability and withdrawal; M3 evaluation and demo.
