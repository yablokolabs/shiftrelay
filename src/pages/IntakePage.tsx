import { useMemo, useState, type FormEvent } from "react";
import type { CaseRecord } from "../../shared/types";
import type { AppState } from "../api";
import { api } from "../api";
import { Badge, Empty, SectionTitle, formatDate, shortId } from "../ui";

interface Props {
  state: AppState;
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onNavigate: (tab: "fresh", caseId: string) => void;
  refresh: () => Promise<void>;
  notify: (message: string, tone?: "ok" | "error") => void;
}

export function IntakePage({ state, selectedCaseId, onSelectCase, onNavigate, refresh, notify }: Props) {
  const [form, setForm] = useState({
    title: "",
    model: "P100",
    firmware: "",
    site: "",
    symptom: "",
    prerequisites: "",
    transcript: "",
  });
  const [saving, setSaving] = useState(false);
  const cases = useMemo(
    () => [...state.cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.cases],
  );
  const selected = state.cases.find((item) => item.caseId === selectedCaseId) ?? cases[0] ?? null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const record = await api.createCase({
        title: form.title,
        model: form.model,
        firmware: form.firmware.trim() || null,
        site: form.site || "Synthetic field site",
        symptom: form.symptom,
        prerequisitesMet: form.prerequisites
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        transcript: form.transcript.trim()
          ? [{ role: "technician", text: form.transcript.trim() }]
          : [],
      });
      await refresh();
      onSelectCase(record.caseId);
      setForm({ ...form, title: "", symptom: "", transcript: "" });
      notify(`Case ${record.caseId} captured in Meko conversation ${shortId(record.mekoConversationId, 12)}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Shift intake"
        title="Capture the case before the details disappear"
        aside={<Badge tone="teal">{state.cases.length} synthetic cases</Badge>}
      />
      <div className="split split-intake">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>New case</h3>
              <p className="muted">
                The intake agent writes the exchange and a case summary to Meko. No customer data.
              </p>
            </div>
          </div>
          <form className="stack" onSubmit={submit}>
            <label className="field">
              <span>Case title</span>
              <input
                required
                minLength={3}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Dock 3 — faint labels after a short run"
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Model</span>
                <input
                  required
                  value={form.model}
                  onChange={(event) => setForm({ ...form, model: event.target.value })}
                  placeholder="P100"
                />
              </label>
              <label className="field">
                <span>Firmware</span>
                <input
                  value={form.firmware}
                  onChange={(event) => setForm({ ...form, firmware: event.target.value })}
                  placeholder="2.4 (leave blank if unknown)"
                />
              </label>
            </div>
            <label className="field">
              <span>Site</span>
              <input
                value={form.site}
                onChange={(event) => setForm({ ...form, site: event.target.value })}
                placeholder="Synthetic distribution center, Dock 3"
              />
            </label>
            <label className="field">
              <span>Symptom</span>
              <textarea
                required
                minLength={10}
                rows={3}
                value={form.symptom}
                onChange={(event) => setForm({ ...form, symptom: event.target.value })}
                placeholder="What changed, when it happens, and what has been tried."
              />
            </label>
            <label className="field">
              <span>Prerequisites confirmed (comma separated)</span>
              <input
                value={form.prerequisites}
                onChange={(event) => setForm({ ...form, prerequisites: event.target.value })}
                placeholder="Fuser access door opens, Printer idle for 10 minutes"
              />
            </label>
            <label className="field">
              <span>Technician note</span>
              <textarea
                rows={4}
                value={form.transcript}
                onChange={(event) => setForm({ ...form, transcript: event.target.value })}
                placeholder="Friday 16:40. P100 on firmware 2.4. Labels go faint after about 25 pages…"
              />
            </label>
            <div className="form-foot">
              <p className="muted small">
                Synthetic fixtures only. Each case becomes a Meko conversation plus a case memory.
              </p>
              <button className="button primary" disabled={saving}>
                {saving ? "Capturing…" : "Capture case"}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>Captured cases</h3>
              <p className="muted">Newest first. Open a transcript or start a fresh session.</p>
            </div>
          </div>
          <div className="case-list">
            {cases.length === 0 ? <Empty>No cases captured yet.</Empty> : null}
            {cases.map((record) => (
              <button
                key={record.caseId}
                className={`case-row ${selected?.caseId === record.caseId ? "selected" : ""}`}
                onClick={() => onSelectCase(record.caseId)}
              >
                <div className="case-row-main">
                  <strong>{record.title}</strong>
                  <span className="muted small">
                    {record.model} · firmware {record.firmware ?? "not recorded"} · {record.site}
                  </span>
                </div>
                <div className="case-row-meta">
                  <Badge tone={record.mekoConversationId ? "teal" : "neutral"}>
                    {record.mekoConversationId ? "in Meko" : "local"}
                  </Badge>
                  <span className="muted tiny">{formatDate(record.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
          {selected ? <CaseDetail record={selected} onNavigate={onNavigate} /> : null}
        </section>
      </div>
    </div>
  );
}

function CaseDetail({
  record,
  onNavigate,
}: {
  record: CaseRecord;
  onNavigate: (tab: "fresh", caseId: string) => void;
}) {
  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Case transcript</p>
          <h3>{record.title}</h3>
        </div>
        <button className="button ghost" onClick={() => onNavigate("fresh", record.caseId)}>
          Start fresh session
        </button>
      </div>
      <dl className="meta-grid">
        <div>
          <dt>Case</dt>
          <dd className="mono">{record.caseId}</dd>
        </div>
        <div>
          <dt>Model / firmware</dt>
          <dd>
            {record.model} / {record.firmware ?? "not recorded"}
          </dd>
        </div>
        <div>
          <dt>Meko conversation</dt>
          <dd className="mono">{record.mekoConversationId ?? "not captured"}</dd>
        </div>
        <div>
          <dt>Case memory</dt>
          <dd className="mono">{record.mekoCaseMemoryId ?? "—"}</dd>
        </div>
      </dl>
      <p className="symptom">{record.symptom}</p>
      <div className="transcript">
        {record.transcript.length === 0 ? (
          <p className="muted small">No transcript captured.</p>
        ) : (
          record.transcript.map((turn, index) => (
            <div className="turn" key={`${turn.role}-${index}`}>
              <span className={`turn-role turn-${turn.role}`}>{turn.role}</span>
              <p>{turn.text}</p>
            </div>
          ))
        )}
      </div>
      {record.prerequisitesMet.length > 0 ? (
        <div className="prereqs">
          <span className="muted small">Prerequisites confirmed</span>
          <div className="chips">
            {record.prerequisitesMet.map((item) => (
              <Badge key={item} tone="neutral">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
