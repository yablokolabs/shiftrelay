import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ApprovalInput,
  CaseInput,
  CaseRecord,
  FixProposalInput,
  FixRecord,
  FixStatus,
  WithdrawalInput,
} from "../../shared/types.js";

export interface ControlEvent {
  eventId: string;
  type:
    | "case.created"
    | "fix.proposed"
    | "fix.approved"
    | "fix.withdrawn"
    | "fix.superseded"
    | "fix.artifact_attached";
  fixId?: string;
  version?: number;
  caseId?: string;
  actor: string;
  at: string;
  detail: Record<string, unknown>;
}

interface ControlState {
  schemaVersion: 1;
  revision: number;
  cases: Record<string, CaseRecord>;
  fixes: Record<string, FixRecord[]>;
  events: ControlEvent[];
}

const STATE_PATH = resolve(process.cwd(), process.env.CONTROL_STORE_PATH ?? "data/control.json");

function emptyState(): ControlState {
  return { schemaVersion: 1, revision: 0, cases: {}, fixes: {}, events: [] };
}

function readState(): ControlState {
  if (!existsSync(STATE_PATH)) return emptyState();
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as ControlState;
  } catch (error) {
    throw new Error(`Control store is unreadable: ${STATE_PATH}. Refusing to overwrite. ${String(error)}`);
  }
}

function writeState(state: ControlState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, STATE_PATH);
}

let chain: Promise<unknown> = Promise.resolve();

/** Serialize mutations inside this process; the file write is atomic via rename. */
function mutate<T>(fn: (state: ControlState) => T): Promise<T> {
  const run = chain.then(() => {
    const state = readState();
    const result = fn(state);
    state.revision += 1;
    writeState(state);
    return result;
  });
  chain = run.catch(() => undefined);
  return run;
}

export class ControlError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function slug(prefix: string, value: string): string {
  const body = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${prefix}-${body || randomUUID().slice(0, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

export const controlStore = {
  snapshot() {
    const state = readState();
    return {
      revision: state.revision,
      cases: Object.values(state.cases),
      fixes: Object.values(state.fixes).flat(),
      events: state.events,
    };
  },

  getCase(caseId: string): CaseRecord | null {
    return readState().cases[caseId] ?? null;
  },

  getFix(fixId: string, version: number): FixRecord | null {
    const versions = readState().fixes[fixId] ?? [];
    return versions.find((fix) => fix.version === version) ?? null;
  },

  getCurrentFix(fixId: string): FixRecord | null {
    const versions = readState().fixes[fixId] ?? [];
    return versions.reduce<FixRecord | null>(
      (latest, fix) => (!latest || fix.version > latest.version ? fix : latest),
      null,
    );
  },

  async createCase(input: CaseInput, actor: string): Promise<CaseRecord> {
    return mutate((state) => {
      const caseId = input.caseId ?? slug("case", `${input.model}-${input.symptom.slice(0, 24)}`);
      if (state.cases[caseId]) return state.cases[caseId];
      const record: CaseRecord = {
        caseId,
        title: input.title,
        model: input.model,
        firmware: input.firmware ?? null,
        symptom: input.symptom,
        site: input.site ?? "Synthetic field site",
        transcript: input.transcript ?? [],
        prerequisitesMet: input.prerequisitesMet ?? [],
        status: "open",
        createdAt: now(),
        mekoConversationId: null,
        mekoCaseMemoryId: null,
      };
      state.cases[caseId] = record;
      state.events.push({
        eventId: `case.created:${caseId}`,
        type: "case.created",
        caseId,
        actor,
        at: record.createdAt,
        detail: { synthetic: true },
      });
      return record;
    });
  },

  async attachCaseContext(
    caseId: string,
    mekoConversationId: string,
    mekoCaseMemoryId: string | null,
  ): Promise<CaseRecord> {
    return mutate((state) => {
      const record = state.cases[caseId];
      if (!record) throw new ControlError(404, "CASE_NOT_FOUND", `Unknown case ${caseId}`);
      record.mekoConversationId = mekoConversationId;
      record.mekoCaseMemoryId = mekoCaseMemoryId;
      state.cases[caseId] = record;
      return record;
    });
  },

  async proposeFix(input: FixProposalInput, actor: string): Promise<FixRecord> {
    return mutate((state) => {
      const fixId = input.fixId ?? slug("fix", `${input.model}-${input.symptom.slice(0, 24)}`);
      const versions = state.fixes[fixId] ?? [];
      const nextVersion = input.version ?? (versions.reduce((max, fix) => Math.max(max, fix.version), 0) + 1);
      const existing = versions.find((fix) => fix.version === nextVersion);
      if (existing) {
        if (existing.status === "proposed" && existing.sourceCaseId === input.sourceCaseId) return existing;
        throw new ControlError(
          409,
          "FIX_VERSION_EXISTS",
          `${fixId} v${nextVersion} already exists with status ${existing.status}.`,
        );
      }
      const timestamp = now();
      const record: FixRecord = {
        fixId,
        version: nextVersion,
        sourceCaseId: input.sourceCaseId,
        symptom: input.symptom,
        model: input.model,
        supportedFirmware: [...new Set(input.supportedFirmware.map((v) => v.trim()).filter(Boolean))],
        prerequisites: [...new Set(input.prerequisites.map((v) => v.trim()).filter(Boolean))],
        steps: input.steps.map((v) => v.trim()).filter(Boolean),
        approver: null,
        status: "proposed",
        supersedes: input.supersedes ?? (nextVersion > 1 ? `${fixId}#v${nextVersion - 1}` : null),
        createdAt: timestamp,
        updatedAt: timestamp,
        approvedAt: null,
        withdrawnAt: null,
        withdrawalReason: null,
        proposalMemoryId: null,
        sharedMemoryId: null,
        artifactHash: null,
        revision: 1,
      };
      state.fixes[fixId] = [...versions, record];
      state.events.push({
        eventId: `fix.proposed:${fixId}:v${nextVersion}`,
        type: "fix.proposed",
        fixId,
        version: nextVersion,
        caseId: input.sourceCaseId,
        actor,
        at: timestamp,
        detail: { synthetic: true, model: record.model, firmware: record.supportedFirmware },
      });
      return record;
    });
  },

  async attachProposalMemory(fixId: string, version: number, memoryId: string): Promise<FixRecord> {
    return mutate((state) => {
      const record = findRecord(state, fixId, version);
      record.proposalMemoryId = memoryId;
      record.revision += 1;
      record.updatedAt = now();
      return record;
    });
  },

  async approveFix(
    fixId: string,
    version: number,
    input: ApprovalInput,
    sharedMemoryId?: string,
  ): Promise<FixRecord> {
    return mutate((state) => {
      const record = findRecord(state, fixId, version);
      if (!input.approver.trim()) throw new ControlError(400, "APPROVER_REQUIRED", "A named human approver is required.");
      if (record.revision !== input.expectedFixRevision) {
        throw new ControlError(
          409,
          "REVISION_CONFLICT",
          `Expected revision ${input.expectedFixRevision}, found ${record.revision}. Reload before approving.`,
        );
      }
      if (record.status === "approved") {
        throw new ControlError(409, "ALREADY_APPROVED", `${fixId} v${version} is already approved.`);
      }
      if (record.status !== "proposed") {
        throw new ControlError(409, "NOT_APPROVABLE", `${fixId} v${version} is ${record.status}.`);
      }
      const eventId = `fix.approved:${fixId}:v${version}`;
      if (state.events.some((event) => event.eventId === eventId)) {
        throw new ControlError(409, "ALREADY_APPROVED", `An approval event already exists for ${fixId} v${version}.`);
      }
      const timestamp = now();
      const versions = state.fixes[fixId] ?? [];
      for (const other of versions) {
        if (other.status === "approved" && other.version !== version) {
          other.status = "superseded" as FixStatus;
          other.updatedAt = timestamp;
          other.revision += 1;
          state.events.push({
            eventId: `fix.superseded:${fixId}:v${other.version}:by-v${version}`,
            type: "fix.superseded",
            fixId,
            version: other.version,
            actor: input.approver,
            at: timestamp,
            detail: { supersededBy: version },
          });
        }
      }
      record.status = "approved";
      record.approver = input.approver.trim();
      record.approvedAt = timestamp;
      record.updatedAt = timestamp;
      record.sharedMemoryId = sharedMemoryId ?? record.proposalMemoryId;
      record.revision += 1;
      state.events.push({
        eventId,
        type: "fix.approved",
        fixId,
        version,
        caseId: record.sourceCaseId,
        actor: record.approver,
        at: timestamp,
        detail: { expectedFixRevision: input.expectedFixRevision, note: input.note ?? "" },
      });
      return record;
    });
  },

  async withdrawFix(fixId: string, version: number, input: WithdrawalInput): Promise<FixRecord> {
    return mutate((state) => {
      const record = findRecord(state, fixId, version);
      if (record.revision !== input.expectedFixRevision) {
        throw new ControlError(
          409,
          "REVISION_CONFLICT",
          `Expected revision ${input.expectedFixRevision}, found ${record.revision}. Reload before withdrawing.`,
        );
      }
      if (record.status === "withdrawn") {
        throw new ControlError(409, "ALREADY_WITHDRAWN", `${fixId} v${version} is already withdrawn.`);
      }
      if (!input.reason.trim() || !input.actor.trim()) {
        throw new ControlError(400, "WITHDRAWAL_INCOMPLETE", "Actor and reason are required.");
      }
      const timestamp = now();
      record.status = "withdrawn";
      record.withdrawnAt = timestamp;
      record.updatedAt = timestamp;
      record.withdrawalReason = input.reason.trim();
      record.revision += 1;
      state.events.push({
        eventId: `fix.withdrawn:${fixId}:v${version}`,
        type: "fix.withdrawn",
        fixId,
        version,
        actor: input.actor.trim(),
        at: timestamp,
        detail: { reason: input.reason.trim() },
      });
      return record;
    });
  },

  async setSharedMemoryId(fixId: string, version: number, memoryId: string): Promise<FixRecord> {
    return mutate((state) => {
      const record = findRecord(state, fixId, version);
      if (record.sharedMemoryId === memoryId) return record;
      record.sharedMemoryId = memoryId;
      record.revision += 1;
      record.updatedAt = now();
      return record;
    });
  },

  async attachArtifact(fixId: string, version: number, hash: string): Promise<FixRecord> {
    return mutate((state) => {
      const record = findRecord(state, fixId, version);
      if (record.artifactHash === hash) return record;
      record.artifactHash = hash;
      record.revision += 1;
      record.updatedAt = now();
      state.events.push({
        eventId: `fix.artifact_attached:${fixId}:v${version}:${hash}`,
        type: "fix.artifact_attached",
        fixId,
        version,
        actor: "system",
        at: record.updatedAt,
        detail: { contentHash: hash },
      });
      return record;
    });
  },
};

function findRecord(state: ControlState, fixId: string, version: number): FixRecord {
  const record = (state.fixes[fixId] ?? []).find((fix) => fix.version === version);
  if (!record) throw new ControlError(404, "FIX_NOT_FOUND", `Unknown fix ${fixId} v${version}`);
  return record;
}
