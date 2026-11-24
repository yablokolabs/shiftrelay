import assert from "node:assert/strict";
import test from "node:test";
import { decideApplicability, normalizeFirmware } from "../shared/applicability.js";
import type { CaseRecord, FixRecord, RetrievalRef } from "../shared/types.js";

const NOW = "2026-11-24T10:00:00.000Z";

function caseRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    caseId: "case-test",
    title: "Test case",
    model: "P100",
    firmware: "2.4",
    symptom: "Faint labels after 20-30 pages.",
    site: "Synthetic",
    transcript: [],
    prerequisitesMet: ["Fuser access door opens", "Printer idle for 10 minutes"],
    status: "open",
    createdAt: NOW,
    mekoConversationId: null,
    mekoCaseMemoryId: null,
    ...overrides,
  };
}

function fixRecord(overrides: Partial<FixRecord> = {}): FixRecord {
  return {
    fixId: "fix-p100-fuser-001",
    version: 1,
    sourceCaseId: "case-test",
    symptom: "Faint labels after 20-30 pages.",
    model: "P100",
    supportedFirmware: ["2.4"],
    prerequisites: ["Fuser access door opens", "Printer idle for 10 minutes"],
    steps: ["Do the approved thing."],
    approver: "R. Chen (synthetic technician)",
    status: "approved",
    supersedes: null,
    createdAt: NOW,
    updatedAt: NOW,
    approvedAt: NOW,
    withdrawnAt: null,
    withdrawalReason: null,
    proposalMemoryId: "proposal-memory",
    sharedMemoryId: "shared-memory",
    artifactHash: "abc",
    revision: 4,
    ...overrides,
  };
}

function retrieval(overrides: Partial<RetrievalRef> = {}): RetrievalRef {
  return {
    sessionId: "session-a",
    conversationId: "session-a",
    source: "shared_knowledge",
    fixId: "fix-p100-fuser-001",
    fixVersion: 1,
    memoryId: "shared-memory",
    distance: 0.1,
    rerankScore: 0.99,
    retrievedAt: "2026-11-24T10:05:00.000Z",
    ...overrides,
  };
}

test("exact model and firmware recommends the approved fix", () => {
  const result = decideApplicability({
    caseRecord: caseRecord(),
    retrieval: retrieval(),
    canonical: fixRecord(),
    current: fixRecord(),
  });
  assert.equal(result.outcome, "recommended");
  assert.deepEqual(result.steps, ["Do the approved thing."]);
  assert.equal(result.staleRetrieval, false);
});

test("missing firmware asks a question instead of guessing", () => {
  const result = decideApplicability({
    caseRecord: caseRecord({ firmware: null }),
    retrieval: retrieval(),
    canonical: fixRecord(),
    current: fixRecord(),
  });
  assert.equal(result.outcome, "question");
  assert.match(result.headline, /firmware/i);
});

test("firmware mismatch withholds the fix", () => {
  const result = decideApplicability({
    caseRecord: caseRecord({ firmware: "2.3" }),
    retrieval: retrieval(),
    canonical: fixRecord(),
    current: fixRecord(),
  });
  assert.equal(result.outcome, "withheld");
  assert.match(result.checks.at(-1)?.detail ?? "", /not in the approved set/);
});

test("a different model withholds the fix", () => {
  const result = decideApplicability({
    caseRecord: caseRecord({ model: "P109", firmware: "1.8" }),
    retrieval: retrieval(),
    canonical: fixRecord(),
    current: fixRecord(),
  });
  assert.equal(result.outcome, "withheld");
  assert.equal(result.checks.find((check) => check.id === "model")?.outcome, "fail");
});

test("a withdrawn fix cannot be recommended even when retrieval returns it", () => {
  const withdrawn = fixRecord({
    status: "withdrawn",
    withdrawalReason: "Safety review",
    updatedAt: "2026-11-24T10:06:00.000Z",
  });
  const result = decideApplicability({
    caseRecord: caseRecord(),
    retrieval: retrieval(),
    canonical: withdrawn,
    current: withdrawn,
  });
  assert.equal(result.outcome, "withheld");
  assert.match(result.headline, /withdrawn/i);
  assert.equal(result.staleRetrieval, true);
});

test("a superseded version cannot be recommended", () => {
  const old = fixRecord({ status: "superseded" });
  const current = fixRecord({ version: 2, status: "approved" });
  const result = decideApplicability({
    caseRecord: caseRecord(),
    retrieval: retrieval(),
    canonical: old,
    current,
  });
  assert.equal(result.outcome, "withheld");
  assert.match(result.headline, /superseded/i);
});

test("an unapproved proposal asks for review rather than recommending", () => {
  const proposed = fixRecord({ status: "proposed", approver: null, approvedAt: null });
  const result = decideApplicability({
    caseRecord: caseRecord(),
    retrieval: retrieval(),
    canonical: proposed,
    current: proposed,
  });
  assert.equal(result.outcome, "question");
  assert.match(result.answer, /must approve/i);
});

test("a missing prerequisite withholds the fix", () => {
  const result = decideApplicability({
    caseRecord: caseRecord({ prerequisitesMet: ["Fuser access door opens"] }),
    retrieval: retrieval(),
    canonical: fixRecord(),
    current: fixRecord(),
  });
  assert.equal(result.outcome, "withheld");
  assert.match(result.answer, /Printer idle for 10 minutes/);
});

test("firmware normalization treats 2.4 and 2.4.0 as the same", () => {
  assert.equal(normalizeFirmware("v2.4"), normalizeFirmware("2.4.0"));
  assert.equal(normalizeFirmware("2.3"), "2.3.0");
});
