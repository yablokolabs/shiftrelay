/**
 * Reconcile canonical shared-memory IDs with the rows Meko actually indexes.
 * Meko may assign a new row id during memory_promote; the canonical record must
 * point at the promoted row, not the private proposal.
 */
import { writeFileSync } from "node:fs";
import { env } from "../server/config.js";
import { openMekoSession } from "../server/meko/mcp.js";
import { controlStore } from "../server/store/control.js";
import { extractFixHits } from "../server/meko/service.js";
import { sanitize } from "../server/sanitize.js";

const datapackId = env.mekoDatapackId;
if (!datapackId) throw new Error("MEKO_DATAPACK_ID missing");

const session = await openMekoSession("reconcile", "shiftrelay:maintenance", datapackId, "Reconcile shared memory ids");
const records: Array<Record<string, unknown>> = [];

for (const fix of controlStore.snapshot().fixes) {
  if (fix.status === "proposed") continue;
  const result = await session.call("knowledgebase_search", {
    query: `SHIFTRELAY_FIX ${fix.fixId} version ${fix.version} ${fix.model} ${fix.status}`,
    conversation_id: session.conversationId,
    datapack_id: datapackId,
    agent_id: session.agentId,
    limit: 10,
  });
  const hit = extractFixHits(result).find(
    (candidate) =>
      candidate.snapshot.fixId === fix.fixId && Number(candidate.snapshot.version) === fix.version,
  );
  if (hit?.ref.memoryId && hit.ref.memoryId !== fix.sharedMemoryId) {
    await controlStore.setSharedMemoryId(fix.fixId, fix.version, hit.ref.memoryId);
    records.push({
      fixId: fix.fixId,
      version: fix.version,
      before: fix.sharedMemoryId,
      after: hit.ref.memoryId,
    });
  }
}

writeFileSync("docs/evidence/reconcile.json", `${JSON.stringify(sanitize({ checked_at: new Date().toISOString(), updated: records }), null, 2)}\n`);
console.log(JSON.stringify(records, null, 2));
