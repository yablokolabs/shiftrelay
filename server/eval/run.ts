import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DecisionEvidence, DecisionOutcome, RetrievalRef } from "../../shared/types.js";
import { env } from "../config.js";
import { controlStore } from "../store/control.js";
import { approveFix, diagnoseCase } from "../meko/service.js";
import { sanitize } from "../sanitize.js";

type Arm = "baseline" | "treatment";

interface Scenario {
  id: string;
  caseId: string;
  expectedTreatment: DecisionOutcome;
  expectedBaseline: DecisionOutcome;
  overrideSnapshot?: string;
  description: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "exact_match",
    caseId: "case-001-friday-p100",
    expectedTreatment: "recommended",
    expectedBaseline: "no_fix",
    description: "P100 firmware 2.4, exact approved fix.",
  },
  {
    id: "missing_firmware",
    caseId: "case-002-monday-p100",
    expectedTreatment: "question",
    expectedBaseline: "no_fix",
    description: "P100 with no firmware recorded; must ask, not guess.",
  },
  {
    id: "firmware_mismatch",
    caseId: "case-003-p100-fw23",
    expectedTreatment: "withheld",
    expectedBaseline: "no_fix",
    description: "P100 firmware 2.3 against a 2.4-only fix.",
  },
  {
    id: "different_model",
    caseId: "case-004-p109-similar",
    expectedTreatment: "withheld",
    expectedBaseline: "no_fix",
    description: "Similar faint-print symptom on P109; model mismatch.",
  },
  {
    id: "withdrawn_live",
    caseId: "case-005-p109-cutter",
    expectedTreatment: "withheld",
    expectedBaseline: "no_fix",
    description: "Withdrawn cutter fix; a live retrieval must not revive it.",
  },
  {
    id: "withdrawn_delayed_index",
    caseId: "case-005-p109-cutter",
    expectedTreatment: "withheld",
    expectedBaseline: "no_fix",
    overrideSnapshot: "withdrawn",
    description: "Pre-withdrawal retrieval snapshot replayed after withdrawal.",
  },
  {
    id: "superseded_stale",
    caseId: "case-006-p100-roller",
    expectedTreatment: "withheld",
    expectedBaseline: "no_fix",
    overrideSnapshot: "roller-v1",
    description: "Superseded v1 snapshot against the current approved v2.",
  },
  {
    id: "superseded_live",
    caseId: "case-006-p100-roller",
    expectedTreatment: "recommended",
    expectedBaseline: "no_fix",
    description: "Live retrieval after v2 approval; current version may apply.",
  },
];

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function summarize(runs: Array<{ scenario: Scenario; evidence: DecisionEvidence; correct: boolean }>) {
  const recommended = runs.filter((run) => run.evidence.outcome === "recommended").length;
  const incorrectRecommendations = runs.filter(
    (run) => run.evidence.outcome === "recommended" && run.scenario.expectedTreatment !== "recommended",
  ).length;
  return {
    runs: runs.length,
    correctOutcomes: runs.filter((run) => run.correct).length,
    recommended,
    incorrectRecommendations,
    questions: runs.filter((run) => run.evidence.outcome === "question").length,
    withheld: runs.filter((run) => run.evidence.outcome === "withheld").length,
    noFix: runs.filter((run) => run.evidence.outcome === "no_fix").length,
    mcpCalls: runs.reduce((sum, run) => sum + run.evidence.mcpCalls, 0),
    latencyMs: {
      mean: Math.round(runs.reduce((sum, run) => sum + run.evidence.latencyMs, 0) / Math.max(1, runs.length)),
      p50: percentile(runs.map((run) => run.evidence.latencyMs), 50),
      p95: percentile(runs.map((run) => run.evidence.latencyMs), 95),
    },
    tokens: null as null,
  };
}

export async function runEvaluation() {
  const startedAt = new Date().toISOString();
  const snapshots = readJson<Record<string, RetrievalRef>>("docs/evidence/retrieval-snapshots.json", {});
  const primary = env.mekoDatapackId;
  const baseline = env.mekoEvalBaselineDatapackId;
  if (!primary || !baseline) throw new Error("Primary and baseline datapacks must be configured.");

  const runs: Array<{
    scenario: Scenario;
    arm: Arm;
    evidence: DecisionEvidence;
    correct: boolean;
  }> = [];

  for (const scenario of SCENARIOS) {
    for (const arm of ["baseline", "treatment"] as const) {
      const override =
        arm === "treatment" && scenario.overrideSnapshot
          ? snapshots[scenario.overrideSnapshot]
          : undefined;
      const evidence = await diagnoseCase(scenario.caseId, {
        datapackId: arm === "baseline" ? baseline : primary,
        retrievalOverride: override,
        label: `eval-${scenario.id}-${arm}`,
        captureArtifact: false,
      });
      const expected = arm === "baseline" ? scenario.expectedBaseline : scenario.expectedTreatment;
      runs.push({ scenario, arm, evidence, correct: evidence.outcome === expected });
      console.log(
        `${scenario.id}/${arm}: ${evidence.outcome} (expected ${expected}) calls=${evidence.mcpCalls} ${evidence.latencyMs}ms`,
      );
    }
  }

  const duplicateFix = controlStore.getFix("fix-p100-fuser-001", 1);
  const duplicateErrors: string[] = [];
  if (duplicateFix) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await approveFix(duplicateFix.fixId, duplicateFix.version, {
          approver: "R. Chen (synthetic technician)",
          expectedFixRevision: duplicateFix.revision,
          note: `Duplicate approval attempt ${attempt}`,
        });
        duplicateErrors.push(`attempt ${attempt}: unexpectedly succeeded`);
      } catch (error) {
        duplicateErrors.push(`attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const approvalEvents = controlStore
    .snapshot()
    .events.filter(
      (event) => event.type === "fix.approved" && event.fixId === "fix-p100-fuser-001",
    ).length;
  const duplicateApproval = {
    fixId: "fix-p100-fuser-001",
    attempts: duplicateErrors,
    bothRejected: duplicateErrors.every((message) => !message.includes("unexpectedly succeeded")),
    approvalEventCount: approvalEvents,
    singleApprovalEvent: approvalEvents === 1,
    finalStatus: controlStore.getFix("fix-p100-fuser-001", 1)?.status ?? "missing",
  };

  const baselineRuns = runs.filter((run) => run.arm === "baseline").map((run) => ({
    ...run,
    correct: run.evidence.outcome === run.scenario.expectedBaseline,
  }));
  const treatmentRuns = runs.filter((run) => run.arm === "treatment");
  const sessionIds = runs.map((run) => run.evidence.sessionId);
  const distinctSessions = new Set(sessionIds).size;

  const delayed = treatmentRuns.find((run) => run.scenario.id === "withdrawn_delayed_index");
  const withdrawnLive = treatmentRuns.find((run) => run.scenario.id === "withdrawn_live");
  const superseded = treatmentRuns.find((run) => run.scenario.id === "superseded_stale");
  const exact = treatmentRuns.find((run) => run.scenario.id === "exact_match");
  const missing = treatmentRuns.find((run) => run.scenario.id === "missing_firmware");

  const evidence = {
    evaluation: "ShiftRelay fresh-session baseline vs shared-memory treatment",
    synthetic: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    fixtureVersion: "fixtures/cases.json + fixtures/fixes.json (frozen synthetic set)",
    model: {
      responder: "deterministic-rules-v1",
      note:
        "Both arms use the same deterministic responder and the same prompts. No external model key was used, so token counts are not exposed.",
    },
    design: {
      arms: {
        baseline: "Baseline datapack with the same static manual artifact and no learned fix.",
        treatment: "Primary datapack with technician-approved fix promoted into shared knowledge.",
      },
      retrieval: "knowledgebase_search over Meko shared knowledge; canonical status resolved from the control store.",
      sampleSize: runs.length,
      scenarios: SCENARIOS,
      distinctSessions,
      allSessionsDistinct: distinctSessions === runs.length,
    },
    summary: {
      baseline: summarize(baselineRuns),
      treatment: summarize(treatmentRuns),
    },
    scenarios: runs.map((run) => ({
      id: run.scenario.id,
      caseId: run.scenario.caseId,
      arm: run.arm,
      expected: run.arm === "baseline" ? run.scenario.expectedBaseline : run.scenario.expectedTreatment,
      observed: run.evidence.outcome,
      correct: run.correct,
      headline: run.evidence.headline,
      sessionId: run.evidence.sessionId,
      conversationId: run.evidence.conversationId,
      retrievedFix: run.evidence.retrieved.fixId,
      retrievedVersion: run.evidence.retrieved.fixVersion,
      retrievedSource: run.evidence.retrieved.source,
      distance: run.evidence.retrieved.distance,
      staleRetrieval: run.evidence.staleRetrieval,
      canonicalStatus: run.evidence.canonical?.status ?? null,
      mcpCalls: run.evidence.mcpCalls,
      latencyMs: run.evidence.latencyMs,
      checks: run.evidence.checks,
    })),
    duplicateApproval,
    assertions: {
      treatmentRecommendedExact: exact?.evidence.outcome === "recommended",
      treatmentAskedForMissingFirmware: missing?.evidence.outcome === "question",
      withdrawnLiveStayedWithheld: withdrawnLive?.evidence.outcome === "withheld",
      delayedIndexingStayedWithheld: delayed?.evidence.outcome === "withheld" && delayed.evidence.staleRetrieval,
      supersededVersionStayedWithheld: superseded?.evidence.outcome === "withheld",
      duplicateApprovalRejected: duplicateApproval.bothRejected && duplicateApproval.singleApprovalEvent,
      allSessionsDistinct: distinctSessions === runs.length,
    },
    limitations: [
      "Synthetic fixtures only; results establish behavior for these cases, not field accuracy.",
      "The hosted MCP endpoint is stateless per request; a fresh session is a separate initialize plus a separate conversation container.",
      "Meko cannot un-promote or mutate a promoted collective memory through the verified API, so the canonical control store is authoritative for status.",
      "Token counts are not exposed in this configuration; the deterministic responder makes no model call.",
      "Live retrieval after withdrawal still returned the approved snapshot in this fixture set; the canonical status withheld it.",
    ],
  };

  const sanitized = sanitize(evidence);
  mkdirSync("docs/evidence", { recursive: true });
  writeFileSync("docs/evidence/evaluation.json", `${JSON.stringify(sanitized, null, 2)}\n`);
  writeFileSync("docs/evidence/evaluation.md", renderMarkdown(sanitized));
  return sanitized;
}

function renderMarkdown(evidence: {
  summary: {
    baseline: Record<string, unknown>;
    treatment: Record<string, unknown>;
  };
  scenarios: Array<Record<string, any>>;
  assertions: Record<string, boolean>;
  duplicateApproval: unknown;
  limitations: string[];
}): string {
  const summary = evidence.summary;
  const rows = evidence.scenarios
    .map(
      (run) =>
        `| ${run.id} | ${run.arm} | ${run.expected} | ${run.observed} | ${run.correct ? "yes" : "**no**"} | ${run.retrievedFix ?? "—"}${run.retrievedVersion ? ` v${run.retrievedVersion}` : ""} | ${run.staleRetrieval ? "yes" : "no"} | ${run.latencyMs} |`,
    )
    .join("\n");
  const table = (name: string, arm: Record<string, unknown>) =>
    `- ${name}: correct ${arm.correctOutcomes}/${arm.runs}; recommended ${arm.recommended}; incorrect recommendations ${arm.incorrectRecommendations}; questions ${arm.questions}; withheld ${arm.withheld}; no-fix ${arm.noFix}; MCP calls ${arm.mcpCalls}; latency mean ${(arm.latencyMs as { mean: number }).mean} ms / p50 ${(arm.latencyMs as { p50: number }).p50} ms / p95 ${(arm.latencyMs as { p95: number }).p95} ms; tokens not exposed.`;
  return `# Fresh-session evaluation (synthetic)

Both arms use the same deterministic responder and the same prompts. The baseline has the same static manual artifact but no learned fix. The treatment retrieves the technician-approved fix from Meko shared knowledge. Evidence was captured ${new Date().toISOString()}.

## Summary

${table("Baseline", summary.baseline)}
${table("Treatment", summary.treatment)}

Sample size: ${evidence.scenarios.length} decisions. All sessions distinct: ${evidence.assertions.allSessionsDistinct ? "yes" : "**no**"}.

## Per-case results

| Scenario | Arm | Expected | Observed | Correct | Retrieved | Stale | Latency (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Control checks

- Exact match recommended: ${evidence.assertions.treatmentRecommendedExact ? "pass" : "**fail**"}
- Missing firmware asked: ${evidence.assertions.treatmentAskedForMissingFirmware ? "pass" : "**fail**"}
- Withdrawn fix stayed withheld on live retrieval: ${evidence.assertions.withdrawnLiveStayedWithheld ? "pass" : "**fail**"}
- Delayed indexing stayed withheld: ${evidence.assertions.delayedIndexingStayedWithheld ? "pass" : "**fail**"}
- Superseded version stayed withheld: ${evidence.assertions.supersededVersionStayedWithheld ? "pass" : "**fail**"}
- Duplicate approval rejected with one approval event: ${evidence.assertions.duplicateApprovalRejected ? "pass" : "**fail**"}

Duplicate approval detail: ${JSON.stringify(evidence.duplicateApproval)}

## Limitations

${evidence.limitations.map((item) => `- ${item}`).join("\n")}
`;
}
