/**
 * Capability probe: proposed memory -> memory_promote -> fresh-session recall.
 * This is a real write to the primary datapack and is safe to re-run because
 * each probe uses a unique marker. It records what the hosted API actually does.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { env } from "../server/config.js";
import { openMekoSession } from "../server/meko/mcp.js";

const datapackId = env.mekoDatapackId;
if (!datapackId) throw new Error("MEKO_DATAPACK_ID missing");
const marker = `SHIFTRELAY-PROBE-${Date.now()}`;

function firstMemoryId(result: unknown): string {
  const data = result as Record<string, unknown> | null;
  const results = (data?.results ?? data?.memories) as Array<Record<string, unknown>> | undefined;
  return String(results?.[0]?.id ?? data?.memory_id ?? "");
}

async function main() {
  const session = await openMekoSession("promote-probe", "shiftrelay:probe", datapackId, "Promote probe");
  const proposal = await session.call("memory_add", {
    text: `${marker} P100 firmware 2.4 fuser pressure reset. SANITIZED CAPABILITY PROBE, not a real fix.`,
    conversation_id: session.conversationId,
    agent_id: "shiftrelay:probe",
    datapack_id: datapackId,
    metadata: JSON.stringify({ probe: true }),
  });
  const memoryId = firstMemoryId(proposal);
  await new Promise((resolve) => setTimeout(resolve, 8_000));

  let promote: unknown;
  let promoteError = "";
  try {
    promote = await session.call("memory_promote", {
      conversation_id: session.conversationId,
      agent_id: "shiftrelay:probe",
      datapack_id: datapackId,
      memory_ids: [memoryId],
    });
  } catch (error) {
    promoteError = error instanceof Error ? error.message : String(error);
  }

  const fresh = await openMekoSession("promote-fresh", "shiftrelay:probe-next", datapackId, "Promote fresh check");
  const context = await fresh.call("context_search", {
    query: `${marker} fuser pressure reset`,
    conversation_id: fresh.conversationId,
    agent_id: "shiftrelay:probe-next",
    datapack_id: datapackId,
    limit: 10,
  });
  const knowledge = await fresh.call("knowledgebase_search", {
    query: `${marker} fuser pressure reset`,
    conversation_id: fresh.conversationId,
    datapack_id: datapackId,
    agent_id: "shiftrelay:probe-next",
    limit: 10,
  });

  const contextJson = JSON.stringify(context);
  const knowledgeJson = JSON.stringify(knowledge);
  const evidence = {
    probe: "memory promotion and fresh-session recall",
    checked_at: new Date().toISOString(),
    synthetic: true,
    datapack_id: datapackId,
    marker,
    conversation_id: session.conversationId,
    fresh_conversation_id: fresh.conversationId,
    memory_id: memoryId,
    promote_result: promote ?? null,
    promote_error: promoteError || null,
    context_found: contextJson.includes(marker),
    knowledgebase_found: knowledgeJson.includes(marker),
    context_digest: contextJson.slice(0, 1200),
    knowledge_digest: knowledgeJson.slice(0, 1200),
    observed:
      contextJson.includes(marker) || knowledgeJson.includes(marker)
        ? "Shared memory is retrievable from a separate MCP initialize/conversation."
        : "Shared memory was not retrievable in this run.",
  };
  mkdirSync("docs/evidence", { recursive: true });
  writeFileSync("docs/evidence/meko-capabilities.json", `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
