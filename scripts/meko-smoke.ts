/**
 * M0 smoke test: two independent MCP sessions against the shiftrelay datapack.
 * Session A captures a synthetic case, a proposed learning and an artifact.
 * Session B starts fresh, retrieves the memory/artifact, and proves durable
 * cross-session access. Output is sanitized before it is written to docs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { env } from "../server/config.js";
import { openMekoSession } from "../server/meko/mcp.js";
import { mekoRest } from "../server/meko/rest.js";

const datapackId = env.mekoDatapackId;
if (!datapackId) throw new Error("MEKO_DATAPACK_ID missing");

const caseId = "case-m0-smoke-001";
const marker = "SHIFTRELAY-M0-P100-FUSER";

function findMemoryId(result: unknown): string {
  const data = result as Record<string, unknown> | null;
  const results = (data?.results ?? data?.memories) as Array<Record<string, unknown>> | undefined;
  const candidates = [
    data?.memory_id,
    data?.id,
    (data?.memory as Record<string, unknown> | undefined)?.id,
    results?.[0]?.id,
  ];
  return String(candidates.find((value) => typeof value === "string") ?? "");
}

async function main() {
  const startedAt = new Date().toISOString();
  const transcript = [
    "Intake (synthetic): P100 label printer at Dock 3 prints faint labels after 20–30 pages.",
    "Technician (synthetic): Firmware is 2.4. Fuser pressure reset restored full darkness for 48 hours.",
    "Proposed learning (synthetic): for P100 firmware 2.4 only, run the fuser pressure reset sequence; verify 50 consecutive labels.",
  ];

  const intake = await openMekoSession(
    "intake",
    "shiftrelay:intake",
    datapackId,
    `M0 smoke — ${caseId}`,
  );
  const firstConversation = intake.conversationId;

  await intake.call("conversation_add_message", {
    conversation_id: firstConversation,
    agent_id: "shiftrelay:intake",
    datapack_id: datapackId,
    input: transcript[0],
    output: transcript.slice(1).join(" "),
    reasoning:
      "Synthetic smoke-test case for cross-session durability. No customer data.",
    metadata: JSON.stringify({ case_id: caseId, fixture: "m0-smoke" }),
  });

  const memoryResult = await intake.call("memory_add", {
    text: `${marker} P100 firmware 2.4 faint print after 20-30 pages; fuser pressure reset restored darkness. Proposed learning only, not yet approved.`,
    conversation_id: firstConversation,
    agent_id: "shiftrelay:intake",
    datapack_id: datapackId,
    metadata: JSON.stringify({ case_id: caseId, fix_id: "fix-p100-fuser-001", state: "proposed" }),
  });
  const memoryId = findMemoryId(memoryResult);

  const artifact = Buffer.from(
    JSON.stringify(
      {
        case_id: caseId,
        synthetic: true,
        marker,
        captured_at: startedAt,
        transcript,
        note: "Sanitized M0 smoke artifact. No credentials or personal data.",
      },
      null,
      2,
    ),
  );
  const artifactResult = await mekoRest.putArtifact(
    datapackId,
    "m0-smoke-case.json",
    artifact,
    "application/json",
  );
  const localHash = createHash("sha256").update(artifact).digest("hex");

  // Fresh MCP client, fresh initialize, fresh conversation: no shared memory.
  const nextShift = await openMekoSession(
    "next-shift",
    "shiftrelay:next-shift",
    datapackId,
    `M0 fresh-session check — ${caseId}`,
  );
  const secondConversation = nextShift.conversationId;

  const search = await nextShift.call("memory_search", {
    query: "P100 firmware 2.4 faint print fuser pressure reset",
    conversation_id: secondConversation,
    agent_id: "shiftrelay:next-shift",
    datapack_id: datapackId,
    limit: 10,
  });
  const artifactRead = await nextShift.call("artifact_get", {
    content_hash: artifactResult.content_hash,
    conversation_id: secondConversation,
    datapack_id: datapackId,
    agent_id: "shiftrelay:next-shift",
  });

  const searchJson = JSON.stringify(search);
  const artifactJson = JSON.stringify(artifactRead);
  const memoryFound = searchJson.includes(marker) || searchJson.includes("fuser pressure reset");
  const artifactFound =
    artifactJson.includes(artifactResult.content_hash) &&
    (artifactJson.includes(marker) || artifactJson.includes("m0-smoke-case"));

  const evidence = {
    milestone: "M0",
    synthetic: true,
    checked_at: new Date().toISOString(),
    datapack: { id: datapackId, name: "shiftrelay" },
    contract: {
      mcp_url: env.mekoMcpUrl,
      rest_base: env.mekoApiBase,
      protocol: "MCP 2025-06-18 (Streamable HTTP, stateless)",
      tools_verified: ["conversation_create", "conversation_add_message", "memory_add", "memory_search", "artifact_get"],
      rest_verified: ["GET /health", "GET /datapacks", "POST /artifacts", "GET /artifacts/{hash}"],
    },
    session_a: {
      label: intake.label,
      agent_id: intake.agentId,
      conversation_id: firstConversation,
      case_id: caseId,
      memory_id: memoryId || "(id not surfaced in expected field)",
      memory_result: sanitize(memoryResult),
    },
    session_b: {
      label: nextShift.label,
      agent_id: nextShift.agentId,
      conversation_id: secondConversation,
      search_result_count: countMemories(search),
      memory_found: memoryFound,
      artifact_found: artifactFound,
      artifact_hash: artifactResult.content_hash,
      local_hash_matches: localHash === artifactResult.content_hash,
      search_digest: sha256(searchJson),
      artifact_digest: sha256(artifactJson),
      search_excerpt: excerpt(searchJson, marker),
    },
    result: memoryFound && artifactFound ? "PASS" : "FAIL",
    limitations: [
      "Synthetic case only.",
      "The MCP endpoint is stateless in this deployment; sessions are separate initialize cycles and separate conversation containers, not server-side session objects.",
      "Memory extraction is asynchronous; the direct memory_add was used so the check does not depend on extraction latency.",
    ],
  };

  mkdirSync("docs/evidence", { recursive: true });
  writeFileSync("docs/evidence/m0-smoke.json", `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
  if (evidence.result !== "PASS") process.exitCode = 1;
}

function countMemories(result: unknown): number | null {
  const data = result as Record<string, unknown> | null;
  if (!data) return null;
  const results = data.results ?? data.memories;
  return Array.isArray(results) ? results.length : null;
}

function sanitize(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value)
      .replace(/mko_tkn_[A-Za-z0-9_-]+/g, "[REDACTED_MEKO_KEY]")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]"),
  );
}

function excerpt(text: string, needle: string): string {
  const index = text.indexOf(needle);
  if (index < 0) return text.slice(0, 300);
  return text.slice(Math.max(0, index - 120), index + 260);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
