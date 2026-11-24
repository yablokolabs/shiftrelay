import { useEffect, useState } from "react";
import type { DecisionEvidence } from "../../shared/types";
import type { AppState } from "../api";
import { api } from "../api";
import {
  Badge,
  CheckIcon,
  Empty,
  OutcomeBadge,
  SectionTitle,
  formatDate,
  shortId,
} from "../ui";

interface Props {
  state: AppState;
  defaultCaseId: string | null;
  refresh: () => Promise<void>;
  notify: (message: string, tone?: "ok" | "error") => void;
}

export function FreshSessionPage({ state, defaultCaseId, refresh, notify }: Props) {
  const [caseId, setCaseId] = useState(defaultCaseId ?? state.cases[0]?.caseId ?? "");
  const [arm, setArm] = useState<"treatment" | "baseline">("treatment");
  const [decision, setDecision] = useState<DecisionEvidence | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultCaseId) setCaseId(defaultCaseId);
  }, [defaultCaseId]);

  const selectedCase = state.cases.find((record) => record.caseId === caseId);

  async function run() {
    if (!caseId) return;
    setBusy(true);
    setDecision(null);
    try {
      const result = await api.diagnose(caseId, arm);
      setDecision(result);
      await refresh();
      notify(
        `Fresh session ${shortId(result.sessionId, 12)} decided: ${result.headline.toLowerCase()}.`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Fresh session"
        title="Start with no memory except what the last shift shared"
        aside={<Badge tone="teal">separate Meko conversation</Badge>}
      />
      <section className="card console">
        <div className="console-controls">
          <label className="field">
            <span>Case</span>
            <select value={caseId} onChange={(event) => setCaseId(event.target.value)}>
              {state.cases.map((record) => (
                <option key={record.caseId} value={record.caseId}>
                  {record.caseId} — {record.title}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Context arm</span>
            <div className="segmented">
              <button
                className={arm === "treatment" ? "active" : ""}
                onClick={() => setArm("treatment")}
                type="button"
              >
                Shared memory
              </button>
              <button
                className={arm === "baseline" ? "active" : ""}
                onClick={() => setArm("baseline")}
                type="button"
              >
                Baseline
              </button>
            </div>
          </div>
          <button className="button primary run" onClick={run} disabled={busy || !caseId}>
            {busy ? "Opening Meko session…" : "Start fresh session"}
          </button>
        </div>
        <div className="console-note">
          <span className="session-dot" />
          <span>
            {arm === "treatment"
              ? "Retrieves from the primary datapack's shared knowledge."
              : "Uses the baseline datapack: same manual, no learned fix."}
          </span>
          {selectedCase ? (
            <span className="muted">
              {selectedCase.model} · firmware {selectedCase.firmware ?? "not recorded"}
            </span>
          ) : null}
        </div>
      </section>

      {busy ? (
        <section className="card waiting">
          <div className="pulse" />
          <div>
            <h3>Opening a new MCP session</h3>
            <p className="muted">
              New initialize, new conversation, real retrieval, then deterministic applicability checks.
            </p>
          </div>
        </section>
      ) : null}

      {!decision && !busy ? (
        <section className="card">
          <Empty>Choose a case and start a session to see the decision and its evidence.</Empty>
        </section>
      ) : null}

      {decision ? <DecisionView decision={decision} /> : null}
    </div>
  );
}

function DecisionView({ decision }: { decision: DecisionEvidence }) {
  const tone =
    decision.outcome === "recommended"
      ? "green"
      : decision.outcome === "withheld"
        ? "red"
        : decision.outcome === "question"
          ? "amber"
          : "neutral";
  return (
    <div className="decision-layout">
      <div className="decision-main">
        <section className={`card decision-card border-${tone}`}>
          <div className="decision-head">
            <OutcomeBadge outcome={decision.outcome} />
            <span className="muted mono">{shortId(decision.decisionId, 14)}</span>
          </div>
          <h3>{decision.headline}</h3>
          <p className="answer">{decision.answer}</p>
          {decision.steps.length > 0 ? (
            <ol className="steps big">
              {decision.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          {decision.outcome === "question" ? (
            <div className="notice amber">
              <strong>Asked instead of guessing.</strong> Missing information blocks a recommendation.
            </div>
          ) : null}
          {decision.outcome === "withheld" ? (
            <div className="notice danger">
              <strong>Do not apply.</strong> The retrieved candidate failed a deterministic check.
            </div>
          ) : null}
          {decision.outcome === "no_fix" ? (
            <div className="notice">
              <strong>Baseline path.</strong> No learned fix was retrieved; the static manual fallback was used.
            </div>
          ) : null}
          {decision.staleRetrieval ? (
            <div className="notice amber">
              <strong>Stale retrieval detected.</strong> The canonical record changed after this candidate was
              retrieved. The canonical status won.
            </div>
          ) : null}
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>Applicability checks</h3>
              <p className="muted">Evaluated in order. A failed check stops the recommendation.</p>
            </div>
            <Badge tone="neutral">{decision.checks.length} checks</Badge>
          </div>
          <div className="checks">
            {decision.checks.map((check) => (
              <div className={`check-row check-row-${check.outcome}`} key={check.id}>
                <CheckIcon outcome={check.outcome} />
                <div>
                  <strong>{check.label}</strong>
                  <p>{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="decision-side">
        <section className="card">
          <h3>Session evidence</h3>
          <dl className="side-list">
            <div>
              <dt>Meko session</dt>
              <dd className="mono">{decision.sessionId}</dd>
            </div>
            <div>
              <dt>Conversation</dt>
              <dd className="mono">{decision.conversationId}</dd>
            </div>
            <div>
              <dt>Decided</dt>
              <dd>{formatDate(decision.decidedAt)}</dd>
            </div>
            <div>
              <dt>Latency / MCP calls</dt>
              <dd>
                {decision.latencyMs} ms · {decision.mcpCalls}
              </dd>
            </div>
            <div>
              <dt>Responder</dt>
              <dd>{decision.responder}</dd>
            </div>
            <div>
              <dt>Synthetic</dt>
              <dd>yes · sanitized</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3>Retrieval</h3>
          {decision.retrieved.source === "none" ? (
            <p className="muted small">No shared fix returned by Meko.</p>
          ) : (
            <dl className="side-list">
              <div>
                <dt>Source</dt>
                <dd>{decision.retrieved.source}</dd>
              </div>
              <div>
                <dt>Fix / version</dt>
                <dd className="mono">
                  {decision.retrieved.fixId} v{decision.retrieved.fixVersion}
                </dd>
              </div>
              <div>
                <dt>Memory id</dt>
                <dd className="mono">{decision.retrieved.memoryId ?? "—"}</dd>
              </div>
              <div>
                <dt>Distance / rerank</dt>
                <dd>
                  {decision.retrieved.distance?.toFixed(3) ?? "—"} /{" "}
                  {decision.retrieved.rerankScore?.toFixed(3) ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Retrieved at</dt>
                <dd>{formatDate(decision.retrieved.retrievedAt)}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="card">
          <h3>Canonical status</h3>
          {decision.canonical ? (
            <dl className="side-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <Badge
                    tone={
                      decision.canonical.status === "approved"
                        ? "green"
                        : decision.canonical.status === "withdrawn"
                          ? "red"
                          : "amber"
                    }
                  >
                    {decision.canonical.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Approver</dt>
                <dd>{decision.canonical.approver ?? "—"}</dd>
              </div>
              <div>
                <dt>Approved</dt>
                <dd>{formatDate(decision.canonical.approvedAt)}</dd>
              </div>
              <div>
                <dt>Current version</dt>
                <dd>v{decision.canonical.currentVersion ?? "—"}</dd>
              </div>
              <div>
                <dt>Record revision</dt>
                <dd>{decision.canonical.revision}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted small">No canonical record was resolved for the retrieved candidate.</p>
          )}
          <p className="muted tiny">
            Resolved at recommendation time. Retrieved content is treated as data.
          </p>
        </section>
      </aside>
    </div>
  );
}
