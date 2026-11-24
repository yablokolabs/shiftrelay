import type {
  ApplicabilityCheck,
  CaseRecord,
  DecisionOutcome,
  FixRecord,
  RetrievalRef,
} from "./types.js";

export interface DecisionInput {
  caseRecord: CaseRecord;
  retrieval: RetrievalRef;
  /** The exact canonical version named by retrieval, resolved authoritatively. */
  canonical: FixRecord | null;
  /** The current canonical version for this fix ID, resolved authoritatively. */
  current: FixRecord | null;
}

export interface DecisionResult {
  outcome: DecisionOutcome;
  checks: ApplicabilityCheck[];
  headline: string;
  answer: string;
  steps: string[];
  staleRetrieval: boolean;
}

export function normalizeFirmware(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = String(value).trim().match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/i);
  if (!match) return String(value).trim();
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3] ?? 0)}`;
}

export function normalizeModel(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Pure, deterministic applicability decision. Retrieved text is data only:
 * status and current version always come from the canonical record passed in.
 */
export function decideApplicability(input: DecisionInput): DecisionResult {
  const { caseRecord, retrieval, canonical, current } = input;
  const checks: ApplicabilityCheck[] = [];
  const staleRetrieval = Boolean(
    canonical && new Date(canonical.updatedAt).getTime() > new Date(retrieval.retrievedAt).getTime(),
  );

  const add = (
    id: string,
    label: string,
    outcome: ApplicabilityCheck["outcome"],
    detail: string,
  ) => checks.push({ id, label, outcome, detail });

  if (!retrieval.fixId || retrieval.source === "none") {
    add("retrieved", "Retrieved candidate", "fail", "No shared fix was retrieved from Meko.");
    return finish("no_fix", checks, "No approved fix retrieved", "No shared fix matched. Use the static manual and escalate if the symptom persists.", [], staleRetrieval);
  }

  add(
    "retrieved",
    "Retrieved candidate",
    "pass",
    `Meko returned ${retrieval.fixId} v${retrieval.fixVersion ?? "?"} from ${retrieval.source}.`,
  );

  if (!canonical) {
    add("canonical", "Canonical record", "fail", "Retrieved text has no canonical record. Treat as untrusted.");
    return finish("withheld", checks, "Withheld: unverified memory", "This fix cannot be recommended because no canonical record exists.", [], staleRetrieval);
  }

  add(
    "canonical",
    "Canonical record",
    "pass",
    `${canonical.fixId} v${canonical.version} resolved from the control store (revision ${canonical.revision}).`,
  );

  if (canonical.status === "withdrawn") {
    add(
      "status",
      "Approval status",
      "fail",
      `Fix is withdrawn${canonical.withdrawalReason ? `: ${canonical.withdrawalReason}` : "."}`,
    );
    return finish(
      "withheld",
      checks,
      "Withheld: fix withdrawn",
      "The technician withdrew this fix. Do not apply it, even though retrieval still returned it.",
      [],
      staleRetrieval,
    );
  }

  if (canonical.status === "superseded") {
    add("status", "Approval status", "fail", "Fix version is superseded.");
    return finish(
      "withheld",
      checks,
      "Withheld: superseded version",
      `This version is no longer current${current ? ` (current v${current.version}, ${current.status})` : ""}. Do not apply it.`,
      [],
      staleRetrieval,
    );
  }

  if (canonical.status === "proposed") {
    add("status", "Approval status", "fail", "Fix is proposed but not technician-approved.");
    return finish(
      "question",
      checks,
      "Not approved yet",
      "This learning is still proposed. A human technician must approve it before it can be shared or applied.",
      [],
      staleRetrieval,
    );
  }

  add("status", "Approval status", "pass", `Approved by ${canonical.approver ?? "technician"}.`);

  if (!current || current.version !== canonical.version) {
    add(
      "version",
      "Version currency",
      "fail",
      `Retrieved v${canonical.version}; current is ${current ? `v${current.version}` : "unavailable"}.`,
    );
    return finish(
      "withheld",
      checks,
      "Withheld: not the current version",
      `Use the current approved version${current ? ` v${current.version}` : ""} if it applies; this retrieved version must not be recommended.`,
      [],
      true,
    );
  }

  if (current.status !== "approved") {
    add("version", "Version currency", "fail", `Current version is ${current.status}.`);
    return finish(
      "withheld",
      checks,
      "Withheld: current version is not approved",
      "The current canonical record is not approved for sharing.",
      [],
      staleRetrieval,
    );
  }

  add("version", "Version currency", "pass", `v${canonical.version} is the current version.`);

  if (normalizeModel(caseRecord.model) !== normalizeModel(canonical.model)) {
    add(
      "model",
      "Equipment model",
      "fail",
      `Case model ${caseRecord.model} does not match fix model ${canonical.model}.`,
    );
    return finish(
      "withheld",
      checks,
      "Withheld: different model",
      `This fix is scoped to ${canonical.model}; the case is ${caseRecord.model}. Do not apply it.`,
      [],
      staleRetrieval,
    );
  }
  add("model", "Equipment model", "pass", `Model ${canonical.model} matches.`);

  const caseFirmware = normalizeFirmware(caseRecord.firmware);
  if (!caseFirmware) {
    add("firmware", "Firmware version", "question", "Case does not report a firmware version.");
    return finish(
      "question",
      checks,
      "Ask for the firmware version",
      "Which firmware version is the printer running? The fix is only approved for specific firmware.",
      [],
      staleRetrieval,
    );
  }

  const supported = canonical.supportedFirmware.map((value) => normalizeFirmware(value));
  if (!supported.includes(caseFirmware)) {
    add(
      "firmware",
      "Firmware applicability",
      "fail",
      `Firmware ${caseFirmware} is not in the approved set (${canonical.supportedFirmware.join(", ")}).`,
    );
    return finish(
      "withheld",
      checks,
      "Withheld: firmware mismatch",
      `This fix is approved for firmware ${canonical.supportedFirmware.join(", ")}, not ${caseRecord.firmware}. Do not apply it.`,
      [],
      staleRetrieval,
    );
  }
  add("firmware", "Firmware applicability", "pass", `Firmware ${caseFirmware} is approved.`);

  const met = new Set(caseRecord.prerequisitesMet);
  const missing = canonical.prerequisites.filter((item) => !met.has(item));
  if (missing.length > 0) {
    add("prerequisites", "Prerequisites", "fail", `Unconfirmed: ${missing.join("; ")}.`);
    return finish(
      "withheld",
      checks,
      "Withheld: prerequisites not met",
      `Confirm these prerequisites before using the fix: ${missing.join("; ")}.`,
      [],
      staleRetrieval,
    );
  }
  add(
    "prerequisites",
    "Prerequisites",
    "pass",
    canonical.prerequisites.length === 0 ? "No prerequisites." : "All prerequisites confirmed.",
  );

  return finish(
    "recommended",
    checks,
    "Approved fix applies",
    `Apply ${canonical.fixId} v${canonical.version}. Approved by ${canonical.approver}.`,
    canonical.steps,
    staleRetrieval,
  );
}

function finish(
  outcome: DecisionOutcome,
  checks: ApplicabilityCheck[],
  headline: string,
  answer: string,
  steps: string[],
  staleRetrieval: boolean,
): DecisionResult {
  return { outcome, checks, headline, answer, steps, staleRetrieval };
}
