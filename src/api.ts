import type {
  CaseRecord,
  CaseInput,
  DecisionEvidence,
  FixRecord,
  FixProposalInput,
} from "../shared/types";

interface ErrorBody {
  error?: { code?: string; message?: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T & ErrorBody) : ({} as T & ErrorBody);
  if (!response.ok) {
    throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export interface AppState {
  revision: number;
  cases: CaseRecord[];
  fixes: FixRecord[];
  events: Array<{ eventId: string; type: string; actor: string; at: string; fixId?: string; version?: number }>;
  decisions: DecisionEvidence[];
  datapacks: { primary: string; baseline: string; project: string | null };
}

export interface Health {
  app: string;
  meko: { ok: boolean; status: string; latencyMs: number; error?: string };
  datapacks: { primary: string; baseline: string; project: string | null };
  model: { provider: string; configured: boolean };
  controlRevision: number;
}

export const api = {
  health: () => request<Health>("/api/health"),
  state: () => request<AppState>("/api/state"),
  createCase: (input: CaseInput) =>
    request<CaseRecord>("/api/cases", { method: "POST", body: JSON.stringify(input) }),
  proposeFix: (input: FixProposalInput) =>
    request<FixRecord>("/api/fixes", { method: "POST", body: JSON.stringify(input) }),
  approve: (fixId: string, version: number, body: { approver: string; expectedFixRevision: number; note?: string }) =>
    request<{ fix: FixRecord; promotion: unknown[]; artifactError: string | null }>(
      `/api/fixes/${encodeURIComponent(fixId)}/versions/${version}/approve`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  withdraw: (fixId: string, version: number, body: { actor: string; expectedFixRevision: number; reason: string }) =>
    request<{ fix: FixRecord; artifactError: string | null }>(
      `/api/fixes/${encodeURIComponent(fixId)}/versions/${version}/withdraw`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  diagnose: (caseId: string, arm: "treatment" | "baseline") =>
    request<DecisionEvidence>("/api/diagnose", {
      method: "POST",
      body: JSON.stringify({ caseId, arm }),
    }),
  evalLatest: () =>
    request<{ available: boolean } & Record<string, any>>("/api/eval/latest"),
  runEval: () => request<Record<string, any>>("/api/eval/run", { method: "POST" }),
};
