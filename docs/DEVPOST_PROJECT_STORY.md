## Inspiration

A fix can disappear at the end of a support shift. The technician who found it goes home; the next agent starts from the manual again. ShiftRelay carries the finding forward with the conditions that made it work.

## What it does

A technician approves a reusable fix with its model, firmware, prerequisites and steps. The approval promotes a technician-approved snapshot into Meko shared knowledge. The next agent opens a fresh session, retrieves the fix, and shows why it applied, asked a question, or withheld it.

The rule that makes it safe: **retrieved content is data, never authority.** Status and current version are resolved from the canonical record at recommendation time.

## How we built it

- **Intake** writes the synthetic case transcript and a case memory to a Meko conversation.
- **Learning** proposes a versioned fix with a model, supported firmware, prerequisites and steps.
- **Review** requires a named human approver. Approval creates an approved snapshot, calls `memory_promote`, commits the canonical approval with an expected-revision check, stores a fix artifact, and writes an approval-event memory.
- **Fresh session** performs a separate MCP initialize and conversation, calls `knowledgebase_search`, parses only this app's `SHIFTRELAY_FIX` records, resolves canonical status and runs deterministic checks: status → current version → model → firmware → prerequisites.
- **Control plane:** because Meko's promoted collective memory has no verified un-promote or status-update operation, status, version and approval events live in an atomic, revision-checked app-owned store. This is documented control metadata; the app never infers approval from a Meko label or metadata filter.
- **Evaluation:** 8 scenarios × 2 arms = 16 decisions. Baseline has the same static manual artifact but no learned fix. Treatment retrieves the approved fix from Meko.

## Challenges we ran into

1. **Retrieval after withdrawal still returned the approved snapshot.** Meko has no un-promote. We preserved this as a negative result and added a canonical status gate. The withdrawn case is withheld even when live retrieval returns it.
2. **Promotion produced a different shared row id than the proposal.** The first canonical records pointed at the proposal memory. We reconciled every fix to the row Meko actually indexed and now capture the promoted id during approval.
3. **`context_search` did not surface the promoted memory** in our probe, while `knowledgebase_search` did. We built on the verified path and documented the difference.
4. **Delayed indexing and supersession.** We captured pre-withdrawal and pre-supersession retrieval snapshots, replayed them after the canonical change, and verified both were withheld and flagged stale.

## Accomplishments that we're proud of

- Real cross-session write/read: a fresh MCP session retrieved both a memory and the exact artifact written by another session.
- Treatment: 8/8 expected outcomes, 2 recommendations, 0 incorrect recommendations, 1 question, 5 withheld.
- All 7 control checks pass, including live withdrawal, delayed indexing, superseded version, duplicate approval and 16/16 distinct sessions.
- A duplicate approval is rejected and leaves exactly one approval event.
- The architecture is documented as four focused diagrams, not one overloaded canvas: system boundaries, Friday approval, Monday fresh session and the gate.
- The 4:04 demo opens with a plain-language Friday/Monday backstory, then makes the decision trace readable with four architecture diagrams, session ids, retrieval source, canonical status and rule checks.

## What we learned

Retrieval quality and approval authority are different problems. Meko is excellent at carrying context across sessions; it is not a mutable policy store. The demo only works because the deterministic gate resolves status and version outside the retrieved text. The negative results — especially live retrieval of a withdrawn fix — are the most useful evidence in the submission.

Token counts were not exposed, and both arms used the same deterministic responder, so the measured comparison is about behavior and calls, not model spend. Synthetic fixtures establish behavior for these cases, not field accuracy.

## What's next for ShiftRelay

Pilot with a consenting field support team using their own approved equipment documentation. Add more applicability dimensions (media type, site conditions, accessory revisions), a reviewer identity and audit flow, and a policy for expiring shared knowledge. Keep the canonical status gate independent of the retrieval layer.
