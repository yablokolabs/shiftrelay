import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ApprovalInput,
  CaseInput,
  CaseRecord,
  DecisionEvidence,
  FixProposalInput,
  FixRecord,
  RetrievalRef,
  WithdrawalInput,
} from "../../shared/types.js";
import { decideApplicability, normalizeModel } from "../../shared/applicability.js";
import { requireDatapackId, env } from "../config.js";
import { openMekoSession, type MekoSession } from "./mcp.js";
import { mekoRest } from "./rest.js";
import { controlStore } from "../store/control.js";
import { sanitize } from "../sanitize.js";
import { baselineAnswer } from "../model/responder.js";

const CASE_MARKER = "SHIFTRELAY_CASE";
const FIX_MARKER = "SHIFTRELAY_FIX";
const APPROVAL_MARKER = "SHIFTRELAY_APPROVAL";
const WITHDRAWAL_MARKER = "SHIFTRELAY_WITHDRAWAL";

function memoryIdFrom(result: unknown): string | null {
  const data = result as Record<string, unknown> | null;
  const results = (data?.results ?? data?.memories) as Array<Record<string, unknown>> | undefined;
  return String(results?.[0]?.id ?? data?.memory_id ?? data?.id ?? "") || null;
}

function markerJson<T>(text: string, marker: string): T | null {
  const index = text.indexOf(marker);
  if (index < 0) return null;
  const start = text.indexOf("{", index + marker.length);
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function evidenceDir(): string {
  const dir = resolve(process.cwd(), "docs/evidence/decisions");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function captureCase(input: CaseInput, actor = "intake"): Promise<CaseRecord> {
  const datapackId = requireDatapackId();
  const record = await controlStore.createCase(input, actor);
  if (record.mekoConversationId) return record;

  const session = await openMekoSession(
    `intake-${record.caseId}`,
    "shiftrelay:intake",
    datapackId,
    `Intake — ${record.title}`,
  );
  const transcriptText = record.transcript.map((turn) => `${turn.role}: ${turn.text}`).join("\n");
  await session.call("conversation_add_message", {
    conversation_id: session.conversationId,
    agent_id: session.agentId,
    datapack_id: datapackId,
    input: transcriptText || record.symptom,
    output: `Case ${record.caseId} captured. Model ${record.model}. Firmware ${record.firmware ?? "not recorded"}.`,
    reasoning:
      "Capture the intake exchange so the next shift can replay the original evidence. Synthetic fixture data only.",
    metadata: JSON.stringify({ case_id: record.caseId, fixture: true }),
  });

  const memory = await session.call("memory_add", {
    text: `${CASE_MARKER} ${JSON.stringify({
      caseId: record.caseId,
      model: record.model,
      firmware: record.firmware,
      symptom: record.symptom,
      site: record.site,
      synthetic: true,
    })}`,
    conversation_id: session.conversationId,
    agent_id: session.agentId,
    datapack_id: datapackId,
    metadata: JSON.stringify({ case_id: record.caseId, state: "case" }),
  });

  return controlStore.attachCaseContext(
    record.caseId,
    session.conversationId,
    memoryIdFrom(memory),
  );
}

export async function proposeFix(input: FixProposalInput): Promise<FixRecord> {
  const datapackId = requireDatapackId();
  const record = await controlStore.proposeFix(input, "learning-agent");
  if (record.proposalMemoryId) return record;

  const session = await openMekoSession(
    `learning-${record.fixId}-v${record.version}`,
    "shiftrelay:learning",
    datapackId,
    `Proposal — ${record.fixId} v${record.version}`,
  );
  const memory = await session.call("memory_add", {
    text: `${FIX_MARKER} ${JSON.stringify({ ...record, status: "proposed" })}`,
    conversation_id: session.conversationId,
    agent_id: session.agentId,
    datapack_id: datapackId,
    metadata: JSON.stringify({
      fix_id: record.fixId,
      version: record.version,
      state: "proposed",
      synthetic: true,
    }),
  });

  return controlStore.attachProposalMemory(record.fixId, record.version, memoryIdFrom(memory) ?? "");
}

async function findSharedFix(
  session: MekoSession,
  datapackId: string,
  fixId: string,
  version: number,
): Promise<{ ref: RetrievalRef; snapshot: FixRecord } | null> {
  const result = await session.call("knowledgebase_search", {
    query: `${FIX_MARKER} ${fixId} version ${version} approved technician`,
    conversation_id: session.conversationId,
    datapack_id: datapackId,
    agent_id: session.agentId,
    limit: 10,
  });
  const hits = extractFixHits(result);
  const match = hits.find((hit) => hit.snapshot.fixId === fixId && hit.snapshot.version === version);
  return match ? { ref: match.ref, snapshot: match.snapshot } : null;
}

interface FixHit {
  ref: RetrievalRef;
  snapshot: FixRecord;
}

export function extractFixHits(result: unknown): FixHit[] {
  const data = result as Record<string, unknown> | null;
  const results = (data?.results ?? []) as Array<Record<string, unknown>>;
  const hits: FixHit[] = [];
  for (const hit of results) {
    const text = String(hit.chunk_text ?? hit.memory ?? hit.text ?? "");
    const snapshot = markerJson<FixRecord>(text, FIX_MARKER);
    if (!snapshot?.fixId || !snapshot.version) continue;
    const filters = (hit.metadata_filters ?? {}) as Record<string, unknown>;
    hits.push({
      snapshot,
      ref: {
        sessionId: "",
        conversationId: "",
        source: filters.source === "memory" ? "shared_knowledge" : "shared_knowledge",
        fixId: snapshot.fixId,
        fixVersion: Number(snapshot.version),
        memoryId: String(filters.memory_id ?? "") || null,
        distance: typeof hit.distance === "number" ? hit.distance : null,
        rerankScore:
          typeof hit.rerank_score === "number"
            ? hit.rerank_score
            : typeof hit.rank === "number"
              ? hit.rank
              : null,
        retrievedAt: new Date().toISOString(),
      },
    });
  }
  return hits.sort((a, b) => (b.ref.rerankScore ?? 0) - (a.ref.rerankScore ?? 0));
}

export async function retrieveFix(
  session: MekoSession,
  datapackId: string,
  caseRecord: CaseRecord,
): Promise<{ ref: RetrievalRef; hits: FixHit[]; error: string | null }> {
  const query = `${caseRecord.model} firmware ${caseRecord.firmware ?? "unknown"} ${caseRecord.symptom}`;
  try {
    const result = await session.call("knowledgebase_search", {
      query,
      conversation_id: session.conversationId,
      datapack_id: datapackId,
      agent_id: session.agentId,
      limit: 10,
    });
    const hits = extractFixHits(result);
    if (hits.length === 0) {
      return {
        hits,
        error: null,
        ref: {
          sessionId: session.conversationId,
          conversationId: session.conversationId,
          source: "none",
          fixId: null,
          fixVersion: null,
          memoryId: null,
          distance: null,
          rerankScore: null,
          retrievedAt: new Date().toISOString(),
        },
      };
    }
    const ref = { ...hits[0].ref, sessionId: session.conversationId, conversationId: session.conversationId };
    return { ref, hits, error: null };
  } catch (error) {
    return {
      hits: [],
      error: error instanceof Error ? error.message : String(error),
      ref: {
        sessionId: session.conversationId,
        conversationId: session.conversationId,
        source: "none",
        fixId: null,
        fixVersion: null,
        memoryId: null,
        distance: null,
        rerankScore: null,
        retrievedAt: new Date().toISOString(),
      },
    };
  }
}

async function ensurePromoted(
  session: MekoSession,
  datapackId: string,
  memoryId: string,
  fixId: string,
  version: number,
): Promise<{ inserted: boolean; observed: unknown[]; sharedMemoryId: string | null }> {
  const observed: unknown[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = (await session.call("memory_promote", {
      conversation_id: session.conversationId,
      agent_id: session.agentId,
      datapack_id: datapackId,
      memory_ids: [memoryId],
    })) as Record<string, unknown> | null;
    observed.push(result);
    const inserted = (result?.inserted_ids as string[] | undefined) ?? [];
    const updated = (result?.updated_ids as string[] | undefined) ?? [];
    if (inserted.includes(memoryId) || updated.includes(memoryId)) {
      const shared = await findSharedFix(session, datapackId, fixId, version);
      return { inserted: true, observed, sharedMemoryId: shared?.ref.memoryId ?? memoryId };
    }
    const shared = await findSharedFix(session, datapackId, fixId, version);
    if (shared) return { inserted: true, observed, sharedMemoryId: shared.ref.memoryId };
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_500));
  }
  return { inserted: false, observed, sharedMemoryId: null };
}

export async function approveFix(
  fixId: string,
  version: number,
  input: ApprovalInput,
): Promise<{ fix: FixRecord; promotion: unknown[]; artifactError: string | null }> {
  const datapackId = requireDatapackId();
  const existing = controlStore.getFix(fixId, version);
  if (!existing) throw new Error(`Unknown fix ${fixId} v${version}`);
  if (existing.revision !== input.expectedFixRevision) {
    throw new Error(`Revision conflict: expected ${input.expectedFixRevision}, found ${existing.revision}`);
  }
  if (!existing.proposalMemoryId) {
    throw new Error("Proposal has no Meko memory; cannot promote approved knowledge.");
  }

  const session = await openMekoSession(
    `review-${fixId}-v${version}`,
    "shiftrelay:review",
    datapackId,
    `Technician review — ${fixId} v${version}`,
  );

  const approvedSnapshot: FixRecord = {
    ...existing,
    status: "approved",
    approver: input.approver.trim(),
    approvedAt: new Date().toISOString(),
  };
  const approvedMemory = await session.call("memory_add", {
    text: `${FIX_MARKER} ${JSON.stringify(approvedSnapshot)}`,
    conversation_id: session.conversationId,
    agent_id: session.agentId,
    datapack_id: datapackId,
    metadata: JSON.stringify({
      fix_id: fixId,
      version,
      state: "approved",
      synthetic: true,
    }),
  });
  const approvedMemoryId = memoryIdFrom(approvedMemory);
  if (!approvedMemoryId) throw new Error("Meko did not return an id for the approved memory.");

  const promotion = await ensurePromoted(session, datapackId, approvedMemoryId, fixId, version);
  if (!promotion.inserted) {
    throw new Error(
      "Meko did not confirm promotion into shared knowledge. Approval was not committed; retry when indexing completes.",
    );
  }

  const fix = await controlStore.approveFix(fixId, version, input, promotion.sharedMemoryId ?? undefined);
  let artifactError: string | null = null;
  try {
    const artifact = Buffer.from(sanitize(JSON.stringify({ fix, approvedSnapshot }, null, 2)));
    const put = await mekoRest.putArtifact(
      datapackId,
      `fixes/${fixId}-v${version}.json`,
      artifact,
      "application/json",
    );
    await controlStore.attachArtifact(fixId, version, put.content_hash);
  } catch (error) {
    artifactError = error instanceof Error ? error.message : String(error);
  }

  await session.call("memory_add", {
    text: `${APPROVAL_MARKER} ${JSON.stringify({
      fixId,
      version,
      approver: input.approver,
      approvedAt: fix.approvedAt,
      note: input.note ?? "",
      sharedMemoryId: approvedMemoryId,
      synthetic: true,
    })}`,
    conversation_id: session.conversationId,
    agent_id: session.agentId,
    datapack_id: datapackId,
    metadata: JSON.stringify({ fix_id: fixId, version, state: "approval_event" }),
  });

  return { fix: controlStore.getFix(fixId, version) ?? fix, promotion: promotion.observed, artifactError };
}

export async function withdrawFix(
  fixId: string,
  version: number,
  input: WithdrawalInput,
): Promise<{ fix: FixRecord; artifactError: string | null }> {
  const datapackId = requireDatapackId();
  const fix = await controlStore.withdrawFix(fixId, version, input);
  let artifactError: string | null = null;
  try {
    const artifact = Buffer.from(
      sanitize(JSON.stringify({ withdrawal: { fixId, version, actor: input.actor, reason: input.reason, at: fix.withdrawnAt } }, null, 2)),
    );
    const put = await mekoRest.putArtifact(
      datapackId,
      `withdrawals/${fixId}-v${version}.json`,
      artifact,
      "application/json",
    );
    await controlStore.attachArtifact(fixId, version, put.content_hash);
  } catch (error) {
    artifactError = error instanceof Error ? error.message : String(error);
  }

  const session = await openMekoSession(
    `withdraw-${fixId}-v${version}`,
    "shiftrelay:review",
    datapackId,
    `Withdrawal — ${fixId} v${version}`,
  );
  await session.call("memory_add", {
    text: `${WITHDRAWAL_MARKER} ${JSON.stringify({
      fixId,
      version,
      actor: input.actor,
      reason: input.reason,
      at: fix.withdrawnAt,
      note: "Canonical status is withdrawn. Do not recommend even if shared retrieval returns the old snapshot.",
      synthetic: true,
    })}`,
    conversation_id: session.conversationId,
    agent_id: session.agentId,
    datapack_id: datapackId,
    metadata: JSON.stringify({ fix_id: fixId, version, state: "withdrawal_event" }),
  });

  return { fix, artifactError };
}

export interface DiagnoseOptions {
  datapackId?: string;
  retrievalOverride?: RetrievalRef;
  label?: string;
  captureArtifact?: boolean;
}

export async function diagnoseCase(
  caseId: string,
  options: DiagnoseOptions = {},
): Promise<DecisionEvidence> {
  const started = Date.now();
  const caseRecord = controlStore.getCase(caseId);
  if (!caseRecord) throw new Error(`Unknown case ${caseId}`);
  const datapackId = options.datapackId ?? requireDatapackId();
  const label = options.label ?? `next-shift-${Date.now()}`;
  const session = await openMekoSession(
    label,
    "shiftrelay:next-shift",
    datapackId,
    `Fresh session — ${caseRecord.title}`,
  );

  let retrieval: RetrievalRef;
  let retrievalError: string | null = null;
  if (options.retrievalOverride) {
    retrieval = {
      ...options.retrievalOverride,
      sessionId: session.conversationId,
      conversationId: session.conversationId,
    };
  } else {
    const live = await retrieveFix(session, datapackId, caseRecord);
    retrieval = live.ref;
    retrievalError = live.error;
  }

  const canonical =
    retrieval.fixId && retrieval.fixVersion
      ? controlStore.getFix(retrieval.fixId, retrieval.fixVersion)
      : null;
  const current = retrieval.fixId ? controlStore.getCurrentFix(retrieval.fixId) : null;
  const result = decideApplicability({ caseRecord, retrieval, canonical, current });
  const answer = result.outcome === "no_fix" ? baselineAnswer(caseRecord) : result.answer;

  const evidence: DecisionEvidence = {
    decisionId: randomUUID(),
    caseId,
    sessionId: session.conversationId,
    conversationId: session.conversationId,
    retrieved: retrieval,
    canonical: canonical
      ? {
          fixId: canonical.fixId,
          version: canonical.version,
          status: canonical.status,
          approver: canonical.approver,
          approvedAt: canonical.approvedAt,
          currentVersion: current?.version ?? null,
          revision: canonical.revision,
        }
      : null,
    checks: result.checks,
    outcome: result.outcome,
    headline: result.headline,
    answer,
    steps: result.steps,
    staleRetrieval: result.staleRetrieval,
    decidedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    responder:
      env.modelProvider === "openrouter" && env.openRouterApiKey
        ? `openrouter:${env.openRouterModel}`
        : "deterministic-rules-v1",
    mekoArtifactHash: null,
    mekoMessageCaptured: false,
    retrievalError,
    mcpCalls: session.calls,
  };

  try {
    await session.call("conversation_add_message", {
      conversation_id: session.conversationId,
      agent_id: session.agentId,
      datapack_id: datapackId,
      input: `Fresh-session diagnosis for ${caseRecord.caseId}: ${caseRecord.symptom}`,
      output: `${evidence.headline}. ${evidence.answer}${evidence.steps.length ? ` Steps: ${evidence.steps.join(" ")}` : ""}`,
      reasoning:
        "The decision is produced by deterministic applicability checks over the canonical record; retrieved text is treated as data.",
      metadata: JSON.stringify({ decision_id: evidence.decisionId, case_id: caseId, synthetic: true }),
    });
    evidence.mekoMessageCaptured = true;
  } catch {
    evidence.mekoMessageCaptured = false;
  }

  if (options.captureArtifact !== false) {
    try {
      const body = Buffer.from(sanitize(JSON.stringify(evidence, null, 2)));
      const put = await mekoRest.putArtifact(
        datapackId,
        `decisions/${caseId}-${evidence.decisionId}.json`,
        body,
        "application/json",
      );
      evidence.mekoArtifactHash = put.content_hash;
    } catch {
      evidence.mekoArtifactHash = null;
    }
  }

  evidence.mcpCalls = session.calls;
  const file = resolve(evidenceDir(), `${caseId}-${evidence.decisionId}.json`);
  writeFileSync(file, `${JSON.stringify(sanitize(evidence), null, 2)}\n`);
  return evidence;
}

export function listDecisionEvidence(limit = 20): DecisionEvidence[] {
  const dir = evidenceDir();
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  return files
    .map((name) => JSON.parse(readFileSync(resolve(dir, name), "utf8")) as DecisionEvidence)
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
    .slice(0, limit);
}

export function fixSnapshot(fix: FixRecord): Record<string, unknown> {
  return {
    fixId: fix.fixId,
    version: fix.version,
    model: normalizeModel(fix.model),
    status: fix.status,
    supportedFirmware: fix.supportedFirmware,
  };
}
