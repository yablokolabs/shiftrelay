import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const directory = mkdtempSync(join(tmpdir(), "shiftrelay-control-"));
process.env.CONTROL_STORE_PATH = join(directory, "control.json");
const { controlStore } = await import("../server/store/control.js");

test("duplicate approval and revision conflicts are rejected", async () => {
  const record = await controlStore.createCase(
    { caseId: "case-unit", title: "Unit case", model: "P100", firmware: "2.4", symptom: "Faint labels after a run." },
    "test",
  );
  assert.equal(record.caseId, "case-unit");

  const fix = await controlStore.proposeFix(
    {
      fixId: "fix-unit",
      version: 1,
      sourceCaseId: "case-unit",
      symptom: "Faint labels after a run.",
      model: "P100",
      supportedFirmware: ["2.4"],
      prerequisites: [],
      steps: ["Step one."],
    },
    "test",
  );
  assert.equal(fix.status, "proposed");

  const approved = await controlStore.approveFix("fix-unit", 1, {
    approver: "Human Approver",
    expectedFixRevision: fix.revision,
  });
  assert.equal(approved.status, "approved");
  assert.equal(approved.approver, "Human Approver");

  await assert.rejects(
    controlStore.approveFix("fix-unit", 1, {
      approver: "Human Approver",
      expectedFixRevision: approved.revision,
    }),
    /already approved/i,
  );
  await assert.rejects(
    controlStore.approveFix("fix-unit", 1, {
      approver: "Human Approver",
      expectedFixRevision: approved.revision - 1,
    }),
    /revision/i,
  );

  const withdrawn = await controlStore.withdrawFix("fix-unit", 1, {
    actor: "Reviewer",
    expectedFixRevision: approved.revision,
    reason: "Superseded by a safer method",
  });
  assert.equal(withdrawn.status, "withdrawn");
  await assert.rejects(
    controlStore.withdrawFix("fix-unit", 1, {
      actor: "Reviewer",
      expectedFixRevision: withdrawn.revision,
      reason: "Again",
    }),
    /already withdrawn/i,
  );

  const events = controlStore.snapshot().events.filter((event) => event.type === "fix.approved");
  assert.equal(events.length, 1);
});

test.after(() => rmSync(directory, { recursive: true, force: true }));
