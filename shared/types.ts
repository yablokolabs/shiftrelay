export type FixStatus = "proposed" | "approved" | "withdrawn" | "superseded";

export interface FixRecord {
  fixId: string;
  version: number;
  sourceCaseId: string;
  symptom: string;
  model: string;
  supportedFirmware: string[];
  prerequisites: string[];
  steps: string[];
  approver: string | null;
  status: FixStatus;
  /** Canonical id of the previous version this version replaces, e.g. fix-x#v1 */
  supersedes: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  withdrawnAt: string | null;
  withdrawalReason: string | null;
  /** Meko memory that held the proposal before promotion. */
  proposalMemoryId: string | null;
  /** Meko shared-knowledge row created by memory_promote. */
  sharedMemoryId: string | null;
  /** Meko artifact holding the immutable fix snapshot. */
  artifactHash: string | null;
  revision: number;
}

export interface CaseRecord {
  caseId: string;
  title: string;
  model: string;
  firmware: string | null;
  symptom: string;
  site: string;
  transcript: Array<{ role: "technician" | "intake" | "system"; text: string }>;
  prerequisitesMet: string[];
  status: "open" | "reviewed";
  createdAt: string;
  mekoConversationId: string | null;
  mekoCaseMemoryId: string | null;
}

export type CheckOutcome = "pass" | "fail" | "question" | "info";

export interface ApplicabilityCheck {
  id: string;
  label: string;
  outcome: CheckOutcome;
  detail: string;
}

export type DecisionOutcome = "recommended" | "withheld" | "question" | "no_fix";

export interface RetrievalRef {
  sessionId: string;
  conversationId: string;
  source: "shared_knowledge" | "memory" | "conversation" | "none";
  fixId: string | null;
  fixVersion: number | null;
  memoryId: string | null;
  distance: number | null;
  rerankScore: number | null;
  retrievedAt: string;
}

export interface DecisionEvidence {
  decisionId: string;
  caseId: string;
  sessionId: string;
  conversationId: string;
  retrieved: RetrievalRef;
  canonical: {
    fixId: string;
    version: number;
    status: FixStatus;
    approver: string | null;
    approvedAt: string | null;
    currentVersion: number | null;
    revision: number;
  } | null;
  checks: ApplicabilityCheck[];
  outcome: DecisionOutcome;
  headline: string;
  answer: string;
  steps: string[];
  staleRetrieval: boolean;
  decidedAt: string;
  latencyMs: number;
  responder: string;
  mekoArtifactHash: string | null;
  mekoMessageCaptured: boolean;
  retrievalError: string | null;
  mcpCalls: number;
}

export interface CaseInput {
  caseId?: string;
  title: string;
  model: string;
  firmware?: string | null;
  symptom: string;
  site?: string;
  prerequisitesMet?: string[];
  transcript?: Array<{ role: "technician" | "intake" | "system"; text: string }>;
}

export interface FixProposalInput {
  fixId?: string;
  version?: number;
  sourceCaseId: string;
  symptom: string;
  model: string;
  supportedFirmware: string[];
  prerequisites: string[];
  steps: string[];
  supersedes?: string | null;
}

export interface ApprovalInput {
  approver: string;
  expectedFixRevision: number;
  note?: string;
}

export interface WithdrawalInput {
  actor: string;
  expectedFixRevision: number;
  reason: string;
}
