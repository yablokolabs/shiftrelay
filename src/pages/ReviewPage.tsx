import { useMemo, useState, type FormEvent } from "react";
import type { FixRecord } from "../../shared/types";
import type { AppState } from "../api";
import { api } from "../api";
import { Badge, Empty, SectionTitle, StatusBadge, formatDate, shortId } from "../ui";

interface Props {
  state: AppState;
  refresh: () => Promise<void>;
  notify: (message: string, tone?: "ok" | "error") => void;
}

const DEFAULT_APPROVER = "R. Chen (synthetic technician)";
const DEFAULT_REVIEWER = "A. Silva (synthetic reviewer)";

export function ReviewPage({ state, refresh, notify }: Props) {
  const fixes = useMemo(
    () =>
      [...state.fixes].sort((a, b) =>
        a.fixId === b.fixId ? b.version - a.version : a.fixId.localeCompare(b.fixId),
      ),
    [state.fixes],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected =
    fixes.find((fix) => `${fix.fixId}#${fix.version}` === selectedKey) ??
    fixes.find((fix) => fix.status === "proposed") ??
    fixes[0] ??
    null;
  const [approver, setApprover] = useState(DEFAULT_APPROVER);
  const [note, setNote] = useState("Synthetic technician approval for the frozen demo fixture set.");
  const [reason, setReason] = useState("Synthetic safety review: a step needs revision.");
  const [busy, setBusy] = useState(false);

  async function approve() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await api.approve(selected.fixId, selected.version, {
        approver,
        expectedFixRevision: selected.revision,
        note,
      });
      await refresh();
      notify(
        `Approved ${selected.fixId} v${selected.version} and promoted the approved snapshot into Meko shared knowledge.`,
      );
      if (result.artifactError) notify(`Artifact warning: ${result.artifactError}`, "error");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.withdraw(selected.fixId, selected.version, {
        actor: DEFAULT_REVIEWER,
        expectedFixRevision: selected.revision,
        reason,
      });
      await refresh();
      notify(`Withdrew ${selected.fixId} v${selected.version}. The canonical status now blocks recommendation.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Technician review"
        title="A human approves the fix before it is shared"
        aside={<Badge tone="amber">{fixes.filter((fix) => fix.status === "proposed").length} awaiting approval</Badge>}
      />
      <div className="split split-review">
        <section className="card queue">
          <div className="card-head">
            <div>
              <h3>Fix register</h3>
              <p className="muted">Versioned records. Status is authoritative here, not in retrieval text.</p>
            </div>
          </div>
          {fixes.length === 0 ? <Empty>No fixes proposed yet.</Empty> : null}
          <div className="fix-list">
            {fixes.map((fix) => {
              const key = `${fix.fixId}#${fix.version}`;
              return (
                <button
                  key={key}
                  className={`fix-row ${selected?.fixId === fix.fixId && selected.version === fix.version ? "selected" : ""}`}
                  onClick={() => setSelectedKey(key)}
                >
                  <div>
                    <strong className="mono">
                      {fix.fixId} <span className="muted">v{fix.version}</span>
                    </strong>
                    <span className="muted small">
                      {fix.model} · firmware {fix.supportedFirmware.join(", ")}
                    </span>
                  </div>
                  <StatusBadge status={fix.status} />
                </button>
              );
            })}
          </div>
          <NewProposal state={state} refresh={refresh} notify={notify} />
        </section>

        <section className="card">
          {selected ? (
            <FixDetail
              fix={selected}
              approver={approver}
              setApprover={setApprover}
              note={note}
              setNote={setNote}
              reason={reason}
              setReason={setReason}
              busy={busy}
              onApprove={approve}
              onWithdraw={withdraw}
            />
          ) : (
            <Empty>Select a fix to review.</Empty>
          )}
        </section>
      </div>
    </div>
  );
}

function FixDetail({
  fix,
  approver,
  setApprover,
  note,
  setNote,
  reason,
  setReason,
  busy,
  onApprove,
  onWithdraw,
}: {
  fix: FixRecord;
  approver: string;
  setApprover: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  busy: boolean;
  onApprove: () => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="fix-detail">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Proposed learning</p>
          <h3>
            <span className="mono">{fix.fixId}</span> <span className="muted">v{fix.version}</span>
          </h3>
        </div>
        <StatusBadge status={fix.status} />
      </div>
      <dl className="meta-grid">
        <div>
          <dt>Scope</dt>
          <dd>
            {fix.model} · firmware {fix.supportedFirmware.join(", ")}
          </dd>
        </div>
        <div>
          <dt>Source case</dt>
          <dd className="mono">{fix.sourceCaseId}</dd>
        </div>
        <div>
          <dt>Supersedes</dt>
          <dd className="mono">{fix.supersedes ?? "—"}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>{fix.revision}</dd>
        </div>
        <div>
          <dt>Approver</dt>
          <dd>{fix.approver ?? "not approved"}</dd>
        </div>
        <div>
          <dt>Approved</dt>
          <dd>{formatDate(fix.approvedAt)}</dd>
        </div>
      </dl>
      <p className="symptom">{fix.symptom}</p>

      <div className="two-col">
        <div>
          <h4>Prerequisites</h4>
          <ul className="plain-list">
            {fix.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Steps</h4>
          <ol className="steps">
            {fix.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="meko-refs">
        <h4>Meko evidence</h4>
        <div className="ref-grid">
          <Ref label="Proposal memory" value={fix.proposalMemoryId} />
          <Ref label="Shared memory" value={fix.sharedMemoryId} />
          <Ref label="Fix artifact" value={fix.artifactHash} />
        </div>
        <p className="muted small">
          Approval promotes a technician-approved snapshot with <code>memory_promote</code>. The canonical
          control record stays authoritative if retrieval is delayed.
        </p>
      </div>

      {fix.status === "proposed" ? (
        <div className="action-panel">
          <div className="action-copy">
            <h4>Approve for sharing</h4>
            <p className="muted small">
              This writes an approval event, promotes the snapshot to shared knowledge and stores a fix
              artifact. The expected revision check rejects duplicate approvals.
            </p>
          </div>
          <div className="stack">
            <label className="field">
              <span>Human approver</span>
              <input value={approver} onChange={(event) => setApprover(event.target.value)} />
            </label>
            <label className="field">
              <span>Review note</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            <button className="button approve" disabled={busy} onClick={onApprove}>
              {busy ? "Promoting…" : "Approve and share"}
            </button>
          </div>
        </div>
      ) : null}

      {fix.status === "approved" ? (
        <div className="action-panel danger">
          <div className="action-copy">
            <h4>Withdraw this fix</h4>
            <p className="muted small">
              Meko cannot un-promote a shared memory. Withdrawal changes the canonical status, so the next
              decision withholds the fix even if retrieval still returns it.
            </p>
          </div>
          <div className="stack">
            <label className="field">
              <span>Reason</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button className="button danger" disabled={busy} onClick={onWithdraw}>
              {busy ? "Withdrawing…" : "Withdraw fix"}
            </button>
          </div>
        </div>
      ) : null}

      {fix.status === "withdrawn" ? (
        <div className="notice danger">
          <strong>Withdrawn.</strong> {fix.withdrawalReason ?? "No reason recorded."}
        </div>
      ) : null}
      {fix.status === "superseded" ? (
        <div className="notice">
          <strong>Superseded.</strong> A newer version is current. This version cannot be recommended.
        </div>
      ) : null}
    </div>
  );
}

function Ref({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="ref">
      <span>{label}</span>
      <code title={value ?? undefined}>{shortId(value, 16)}</code>
    </div>
  );
}

function NewProposal({
  state,
  refresh,
  notify,
}: {
  state: AppState;
  refresh: () => Promise<void>;
  notify: (message: string, tone?: "ok" | "error") => void;
}) {
  const [open, setOpen] = useState(false);
  const firstCase = state.cases[0];
  const [form, setForm] = useState({
    sourceCaseId: firstCase?.caseId ?? "",
    model: firstCase?.model ?? "P100",
    symptom: firstCase?.symptom ?? "",
    firmware: firstCase?.firmware ?? "",
    prerequisites: "Fuser access door opens, Printer idle for 10 minutes",
    steps: "",
  });
  const [busy, setBusy] = useState(false);

  function pickCase(caseId: string) {
    const record = state.cases.find((item) => item.caseId === caseId);
    setForm({
      ...form,
      sourceCaseId: caseId,
      model: record?.model ?? form.model,
      symptom: record?.symptom ?? form.symptom,
      firmware: record?.firmware ?? form.firmware,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const fix = await api.proposeFix({
        sourceCaseId: form.sourceCaseId,
        model: form.model,
        symptom: form.symptom,
        supportedFirmware: form.firmware
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        prerequisites: form.prerequisites
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        steps: form.steps
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      await refresh();
      notify(`Proposed ${fix.fixId} v${fix.version}. It is private until a technician approves it.`);
      setOpen(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="new-proposal">
      <button className="button ghost wide" onClick={() => setOpen(!open)}>
        {open ? "Close proposal form" : "Draft a reusable fix"}
      </button>
      {open ? (
        <form className="stack" onSubmit={submit}>
          <label className="field">
            <span>Source case</span>
            <select value={form.sourceCaseId} onChange={(event) => pickCase(event.target.value)}>
              {state.cases.map((record) => (
                <option key={record.caseId} value={record.caseId}>
                  {record.caseId} — {record.title}
                </option>
              ))}
            </select>
          </label>
          <div className="field-row">
            <label className="field">
              <span>Model</span>
              <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
            </label>
            <label className="field">
              <span>Approved firmware</span>
              <input
                value={form.firmware}
                onChange={(event) => setForm({ ...form, firmware: event.target.value })}
                placeholder="2.4"
              />
            </label>
          </div>
          <label className="field">
            <span>Symptom</span>
            <textarea
              rows={2}
              value={form.symptom}
              onChange={(event) => setForm({ ...form, symptom: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Prerequisites</span>
            <input
              value={form.prerequisites}
              onChange={(event) => setForm({ ...form, prerequisites: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Steps (one per line)</span>
            <textarea
              rows={4}
              required
              value={form.steps}
              onChange={(event) => setForm({ ...form, steps: event.target.value })}
            />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Proposing…" : "Store private proposal"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
