import { useEffect, useState } from "react";
import type { AppState } from "../api";
import { api } from "../api";
import { Badge, Empty, OutcomeBadge, SectionTitle, Stat, formatDate, shortId } from "../ui";

interface Props {
  state: AppState;
  notify: (message: string, tone?: "ok" | "error") => void;
  refresh: () => Promise<void>;
}

export function EvidencePage({ state, notify, refresh }: Props) {
  const [evaluation, setEvaluation] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    try {
      const result = await api.evalLatest();
      setEvaluation(result.available ? result : null);
    } catch {
      setEvaluation(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run() {
    setRunning(true);
    try {
      const result = await api.runEval();
      setEvaluation({ available: true, ...result });
      await refresh();
      notify("Evaluation completed. All evidence was recomputed from fresh Meko sessions.");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setRunning(false);
    }
  }

  const treatment = evaluation?.summary?.treatment;
  const baseline = evaluation?.summary?.baseline;

  return (
    <div className="page">
      <SectionTitle
        eyebrow="Evidence"
        title="Observed results, including the negative cases"
        aside={
          <button className="button ghost" onClick={run} disabled={running}>
            {running ? "Running 16 fresh sessions…" : "Re-run evaluation"}
          </button>
        }
      />
      {loading ? <section className="card"><Empty>Loading evidence…</Empty></section> : null}
      {!loading && !evaluation ? (
        <section className="card">
          <Empty>
            No evaluation file yet. Run <code>npm run eval</code> or use the button above.
          </Empty>
        </section>
      ) : null}

      {evaluation ? (
        <>
          <div className="stat-grid">
            <Stat
              label="Treatment correct"
              value={`${treatment.correctOutcomes}/${treatment.runs}`}
              detail="exact, question, withheld and no-fix outcomes"
            />
            <Stat
              label="Incorrect recommendations"
              value={`${treatment.incorrectRecommendations}`}
              detail="withheld or questioned fixes that were recommended"
            />
            <Stat
              label="Baseline recommendations"
              value={`${baseline.recommended}`}
              detail="same manual, no learned fix"
            />
            <Stat
              label="MCP calls"
              value={`${treatment.mcpCalls}`}
              detail={`baseline ${baseline.mcpCalls}; tokens not exposed`}
            />
            <Stat
              label="Latency p50"
              value={`${treatment.latencyMs.p50} ms`}
              detail={`mean ${treatment.latencyMs.mean} ms · p95 ${treatment.latencyMs.p95} ms`}
            />
            <Stat
              label="Distinct sessions"
              value={`${evaluation.design.distinctSessions}/${evaluation.design.sampleSize}`}
              detail="each decision used its own Meko conversation"
            />
          </div>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>Control checks</h3>
                <p className="muted">
                  Synthetic behavior checks. A failure here is reported as a failure, not smoothed over.
                </p>
              </div>
              <Badge tone={Object.values(evaluation.assertions).every(Boolean) ? "green" : "red"}>
                {Object.values(evaluation.assertions).filter(Boolean).length}/
                {Object.keys(evaluation.assertions).length} pass
              </Badge>
            </div>
            <div className="assertions">
              {Object.entries(evaluation.assertions).map(([key, value]) => (
                <div className={`assertion ${value ? "pass" : "fail"}`} key={key}>
                  <span>{value ? "✓" : "×"}</span>
                  <div>
                    <strong>{humanize(key)}</strong>
                    <p className="muted tiny">{value ? "observed" : "not observed"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>Per-case results</h3>
                <p className="muted">
                  Baseline and treatment use identical prompts and the same deterministic responder.
                </p>
              </div>
              <a className="button ghost" href="/api/eval/latest" target="_blank" rel="noreferrer">
                Raw JSON
              </a>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Arm</th>
                    <th>Expected</th>
                    <th>Observed</th>
                    <th>Correct</th>
                    <th>Retrieved</th>
                    <th>Stale</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.scenarios.map((run: Record<string, any>) => (
                    <tr key={`${run.id}-${run.arm}`}>
                      <td>
                        <strong>{humanize(run.id)}</strong>
                        <span className="muted tiny block">{run.caseId}</span>
                      </td>
                      <td>{run.arm}</td>
                      <td>{run.expected}</td>
                      <td>
                        <OutcomeBadge outcome={run.observed} />
                      </td>
                      <td>{run.correct ? "yes" : <strong className="danger-text">no</strong>}</td>
                      <td className="mono tiny">
                        {run.retrievedFix ? `${run.retrievedFix} v${run.retrievedVersion}` : "—"}
                      </td>
                      <td>{run.staleRetrieval ? "yes" : "no"}</td>
                      <td>{run.latencyMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>Duplicate approval control</h3>
                <p className="muted">Expected-revision checks and a unique approval event prevent reactivation.</p>
              </div>
              <Badge tone={evaluation.duplicateApproval.singleApprovalEvent ? "green" : "red"}>
                {evaluation.duplicateApproval.approvalEventCount} approval event
              </Badge>
            </div>
            <div className="dup-grid">
              <div>
                <span className="muted small">Final status</span>
                <strong>{evaluation.duplicateApproval.finalStatus}</strong>
              </div>
              <div>
                <span className="muted small">Attempts</span>
                <ul className="plain-list small">
                  {evaluation.duplicateApproval.attempts.map((attempt: string) => (
                    <li key={attempt}>{attempt}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>Latest decisions</h3>
                <p className="muted">Sanitized artifacts written by the app. No keys or contact details.</p>
              </div>
            </div>
            {state.decisions.length === 0 ? <Empty>No decisions captured yet.</Empty> : null}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Outcome</th>
                    <th>Retrieved</th>
                    <th>Canonical</th>
                    <th>Session</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {state.decisions.map((decision) => (
                    <tr key={decision.decisionId}>
                      <td className="mono tiny">{decision.caseId}</td>
                      <td>
                        <OutcomeBadge outcome={decision.outcome} />
                      </td>
                      <td className="mono tiny">
                        {decision.retrieved.fixId
                          ? `${decision.retrieved.fixId} v${decision.retrieved.fixVersion}`
                          : "none"}
                      </td>
                      <td>{decision.canonical?.status ?? "—"}</td>
                      <td className="mono tiny">{shortId(decision.sessionId, 12)}</td>
                      <td className="tiny">{formatDate(decision.decidedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card limitations">
            <h3>Limitations</h3>
            <ul className="plain-list">
              {evaluation.limitations.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
