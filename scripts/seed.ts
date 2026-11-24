/**
 * Idempotent seed: cases, proposed fixes, technician approvals, one withdrawal,
 * one supersession, shared-memory promotion, and the baseline arm.
 * All content is synthetic.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "../server/config.js";
import { openMekoSession } from "../server/meko/mcp.js";
import { mekoRest } from "../server/meko/rest.js";
import { controlStore } from "../server/store/control.js";
import { captureCase, proposeFix, approveFix, withdrawFix, retrieveFix } from "../server/meko/service.js";
import { sanitize } from "../server/sanitize.js";
import type { FixProposalInput, RetrievalRef } from "../shared/types.js";

const PROJECT_NAME = "ShiftRelay";
const BASELINE_NAME = "shiftrelay-baseline";
const APPROVER = "R. Chen (synthetic technician)";
const WITHDRAWER = "A. Silva (synthetic reviewer)";

interface FixtureCase {
  caseId: string;
  title: string;
  model: string;
  firmware: string | null;
  site: string;
  symptom: string;
  prerequisitesMet: string[];
  transcript: Array<{ role: "technician" | "intake" | "system"; text: string }>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;
}

function upsertEnv(values: Record<string, string>): void {
  const path = resolve(process.cwd(), ".env");
  const current = existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(values));
  const next = current.filter((line) => {
    const key = line.split("=")[0]?.trim();
    return !key || !keys.has(key);
  });
  for (const [key, value] of Object.entries(values)) next.push(`${key}=${value}`);
  writeFileSync(path, `${next.filter((line, index, all) => line || index < all.length - 1).join("\n")}\n`, {
    mode: 0o600,
  });
}

async function ensureBaselineDatapack(): Promise<string> {
  if (env.mekoEvalBaselineDatapackId) return env.mekoEvalBaselineDatapackId;
  const list = await mekoRest.listDatapacks();
  const existing = list.items.find((item) => item.datapack_name === BASELINE_NAME);
  if (existing) return existing.datapack_id;
  const created = await mekoRest.createDatapack(
    BASELINE_NAME,
    "Evaluation arm: identical static manual, no learned shared fix.",
  );
  return created.datapack_id;
}

async function ensureProject(primaryDatapackId: string, baselineDatapackId: string) {
  const session = await openMekoSession(
    "project-setup",
    "shiftrelay:setup",
    primaryDatapackId,
    "ShiftRelay project setup",
  );
  const list = (await session.call("project_list", {
    conversation_id: session.conversationId,
  })) as { owned?: Array<Record<string, unknown>> };
  let projectId = String(list.owned?.find((project) => project.project_name === PROJECT_NAME)?.project_id ?? "");
  if (!projectId) {
    const created = (await session.call("project_create", {
      project_name: PROJECT_NAME,
      description:
        "Carry technician-approved printer fixes across shifts with Meko shared context. Synthetic field-support fixtures only.",
      folders: ["Field knowledge", "Evaluation"],
      conversation_id: session.conversationId,
    })) as { project_id?: string };
    projectId = String(created.project_id ?? "");
  }
  const described = (await session.call("project_describe", {
    project_id: projectId,
    conversation_id: session.conversationId,
  })) as {
    folders?: Array<{ folder_id: string; folder_name: string }>;
    datapacks?: Array<{ datapack_id: string }>;
  };
  const fieldFolder = described.folders?.find((folder) => folder.folder_name === "Field knowledge")?.folder_id;
  const evalFolder = described.folders?.find((folder) => folder.folder_name === "Evaluation")?.folder_id;
  if (!fieldFolder || !evalFolder) throw new Error("Meko project folders were not created as expected.");

  const filed = new Set((described.datapacks ?? []).map((item) => item.datapack_id));
  for (const [datapackId, folderId] of [
    [primaryDatapackId, fieldFolder],
    [baselineDatapackId, evalFolder],
  ] as const) {
    if (filed.has(datapackId)) continue;
    try {
      await session.call("project_add_datapack", {
        datapack_id: datapackId,
        folder_id: folderId,
        conversation_id: session.conversationId,
      });
    } catch (error) {
      console.warn(`project_add_datapack skipped for ${datapackId}: ${String(error)}`);
    }
  }
  return { projectId, fieldFolder, evalFolder };
}

async function snapshot(datapackId: string, caseId: string, label: string): Promise<RetrievalRef> {
  const caseRecord = controlStore.getCase(caseId);
  if (!caseRecord) throw new Error(`Missing case ${caseId}`);
  const session = await openMekoSession(
    `snapshot-${label}`,
    "shiftrelay:next-shift",
    datapackId,
    `Retrieval snapshot — ${label}`,
  );
  const { ref } = await retrieveFix(session, datapackId, caseRecord);
  return ref;
}

async function main() {
  const primary = env.mekoDatapackId;
  if (!primary) throw new Error("MEKO_DATAPACK_ID missing");

  const baseline = await ensureBaselineDatapack();
  const project = await ensureProject(primary, baseline);
  upsertEnv({
    MEKO_EVAL_BASELINE_DATAPACK_ID: baseline,
    MEKO_PROJECT_ID: project.projectId,
    MEKO_PROJECT_FIELD_FOLDER_ID: project.fieldFolder,
    MEKO_PROJECT_EVAL_FOLDER_ID: project.evalFolder,
  });

  const cases = readJson<FixtureCase[]>("fixtures/cases.json");
  const fixes = readJson<FixProposalInput[]>("fixtures/fixes.json");

  for (const fixture of cases) {
    if (controlStore.getCase(fixture.caseId)?.mekoConversationId) continue;
    const record = await captureCase(fixture, "seed");
    console.log(`case ${record.caseId} -> conversation ${record.mekoConversationId}`);
  }

  const byKey = new Map(fixes.map((fix) => [`${fix.fixId}#v${fix.version}`, fix]));
  const ensureProposed = async (key: string) => {
    const fixture = byKey.get(key);
    if (!fixture) throw new Error(`Missing fix fixture ${key}`);
    if (controlStore.getFix(fixture.fixId!, fixture.version!)) return;
    const record = await proposeFix(fixture);
    console.log(`proposed ${record.fixId} v${record.version}`);
  };
  const ensureApproved = async (key: string) => {
    const fixture = byKey.get(key)!;
    const record = controlStore.getFix(fixture.fixId!, fixture.version!);
    if (!record) throw new Error(`Fix ${key} not proposed`);
    if (record.status !== "proposed") return;
    const result = await approveFix(record.fixId, record.version, {
      approver: APPROVER,
      expectedFixRevision: record.revision,
      note: "Synthetic technician approval for the frozen demo fixture set.",
    });
    console.log(`approved ${record.fixId} v${record.version}`);
    if (result.artifactError) console.warn(`artifact warning: ${result.artifactError}`);
  };

  await ensureProposed("fix-p100-fuser-001#v1");
  await ensureApproved("fix-p100-fuser-001#v1");

  let snapshots: Record<string, RetrievalRef> = existsSync("docs/evidence/retrieval-snapshots.json")
    ? readJson<Record<string, RetrievalRef>>("docs/evidence/retrieval-snapshots.json")
    : {};

  await ensureProposed("fix-p109-cutter-002#v1");
  await ensureApproved("fix-p109-cutter-002#v1");
  const cutter = controlStore.getFix("fix-p109-cutter-002", 1);
  if (cutter?.status === "approved" && !snapshots["withdrawn"]) {
    snapshots["withdrawn"] = await snapshot(primary, "case-005-p109-cutter", "withdrawn");
    console.log("captured cutter retrieval snapshot before withdrawal");
  }
  if (cutter?.status === "approved") {
    await withdrawFix(cutter.fixId, cutter.version, {
      actor: WITHDRAWER,
      expectedFixRevision: cutter.revision,
      reason: "Synthetic safety review: sensor reseat step needs a revised torque value.",
    });
    console.log("withdrew fix-p109-cutter-002 v1");
  }

  await ensureProposed("fix-p100-roller-003#v1");
  await ensureApproved("fix-p100-roller-003#v1");
  await ensureProposed("fix-p100-roller-003#v2");
  const rollerV1 = controlStore.getFix("fix-p100-roller-003", 1);
  const rollerV2 = controlStore.getFix("fix-p100-roller-003", 2);

  if (rollerV1?.status === "approved" && !snapshots["roller-v1"]) {
    snapshots["roller-v1"] = await snapshot(primary, "case-006-p100-roller", "roller-v1");
    console.log("captured v1 retrieval snapshot before supersession");
  }
  if (rollerV2?.status === "proposed") {
    await ensureApproved("fix-p100-roller-003#v2");
    console.log("approved fix-p100-roller-003 v2 (supersedes v1)");
  }
  const withdrawnSnapshot = controlStore.getFix("fix-p109-cutter-002", 1);
  if (withdrawnSnapshot && !snapshots["withdrawn"] && withdrawnSnapshot.status === "withdrawn") {
    snapshots["withdrawn"] = {
      sessionId: "seed-pre-withdrawal",
      conversationId: "seed-pre-withdrawal",
      source: "shared_knowledge",
      fixId: "fix-p109-cutter-002",
      fixVersion: 1,
      memoryId: withdrawnSnapshot.sharedMemoryId,
      distance: null,
      rerankScore: null,
      retrievedAt: withdrawnSnapshot.approvedAt ?? new Date().toISOString(),
    };
  }
  if (!snapshots["roller-v1"] && rollerV1) {
    snapshots["roller-v1"] = {
      sessionId: "seed-pre-supersession",
      conversationId: "seed-pre-supersession",
      source: "shared_knowledge",
      fixId: rollerV1.fixId,
      fixVersion: rollerV1.version,
      memoryId: rollerV1.sharedMemoryId,
      distance: null,
      rerankScore: null,
      retrievedAt: rollerV1.approvedAt ?? new Date().toISOString(),
    };
  }
  if (!snapshots["primary"]) {
    snapshots["primary"] = await snapshot(primary, "case-001-friday-p100", "primary");
  }
  mkdirSync("docs/evidence", { recursive: true });
  writeFileSync("docs/evidence/retrieval-snapshots.json", `${JSON.stringify(sanitize(snapshots), null, 2)}\n`);

  const manual = readFileSync("fixtures/manual.md");
  for (const datapackId of [primary, baseline]) {
    const put = await mekoRest.putArtifact(datapackId, "P-SERIES-FSM-2026.03.md", manual, "text/markdown");
    console.log(`manual artifact ${datapackId} -> ${put.content_hash}`);
  }

  const baselineCheck = await openMekoSession(
    "baseline-check",
    "shiftrelay:next-shift",
    baseline,
    "Baseline arm check",
  );
  const baselineCase = controlStore.getCase("case-001-friday-p100")!;
  const baselineRetrieval = await retrieveFix(baselineCheck, baseline, baselineCase);
  const treatmentCheck = await openMekoSession(
    "treatment-check",
    "shiftrelay:next-shift",
    primary,
    "Treatment arm check",
  );
  const treatmentRetrieval = await retrieveFix(treatmentCheck, primary, baselineCase);

  const evidence = {
    milestone: "M1",
    synthetic: true,
    seeded_at: new Date().toISOString(),
    project: { id: project.projectId, name: PROJECT_NAME, folders: ["Field knowledge", "Evaluation"] },
    datapacks: { primary, baseline },
    cases: controlStore.snapshot().cases.length,
    fixes: controlStore.snapshot().fixes.map((fix) => ({
      fixId: fix.fixId,
      version: fix.version,
      status: fix.status,
      approver: fix.approver,
      sharedMemoryId: fix.sharedMemoryId,
      artifactHash: fix.artifactHash,
    })),
    retrieval: {
      baseline_fix_found: Boolean(baselineRetrieval.ref.fixId),
      treatment_fix_found: Boolean(treatmentRetrieval.ref.fixId),
      treatment_ref: treatmentRetrieval.ref,
    },
    note:
      "The baseline datapack has the same manual artifact but no promoted fix. The primary datapack is the treatment arm.",
  };
  writeFileSync("docs/evidence/seed.json", `${JSON.stringify(sanitize(evidence), null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
