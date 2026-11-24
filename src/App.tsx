import { useCallback, useEffect, useState } from "react";
import type { AppState, Health } from "./api";
import { api } from "./api";
import { EvidencePage } from "./pages/EvidencePage";
import { FreshSessionPage } from "./pages/FreshSessionPage";
import { IntakePage } from "./pages/IntakePage";
import { ReviewPage } from "./pages/ReviewPage";

type Tab = "intake" | "review" | "fresh" | "evidence";

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "intake", label: "Intake", hint: "capture the case" },
  { id: "review", label: "Review queue", hint: "approve the fix" },
  { id: "fresh", label: "Fresh session", hint: "retrieve and decide" },
  { id: "evidence", label: "Evidence", hint: "observed results" },
];

function tabFromHash(): Tab {
  const value = window.location.hash.replace(/^#/, "");
  return TABS.some((item) => item.id === value) ? (value as Tab) : "intake";
}

export function App() {
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [state, setState] = useState<AppState | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await api.state();
    setState(next);
    setSelectedCaseId((current) => current ?? next.cases[0]?.caseId ?? null);
  }, []);

  useEffect(() => {
    Promise.all([refresh(), api.health().then(setHealth).catch(() => setHealth(null))]).catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : String(loadError)),
    );
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    setToast({ message, tone });
  }, []);

  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    if (window.location.hash !== `#${next}`) {
      window.history.replaceState(null, "", `#${next}`);
    }
  }, []);

  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function navigateToFresh(caseId: string) {
    setSelectedCaseId(caseId);
    setTab("fresh");
  }

  if (error) {
    return (
      <div className="fatal">
        <img src="/logo.png" alt="ShiftRelay" />
        <h1>Could not start ShiftRelay</h1>
        <p>{error}</p>
        <p className="muted">
          Check <code>.env</code>, run <code>npm run seed</code>, and confirm the Meko key is valid.
        </p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="fatal">
        <img src="/logo.png" alt="ShiftRelay" />
        <div className="loader" />
        <p className="muted">Loading cases, approvals and evidence…</p>
      </div>
    );
  }

  const approved = state.fixes.filter((fix) => fix.status === "approved").length;
  const proposed = state.fixes.filter((fix) => fix.status === "proposed").length;
  const withdrawn = state.fixes.filter((fix) => fix.status === "withdrawn").length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="ShiftRelay" />
          <span className="brand-rule" />
          <span className="brand-sub">Never solve it twice</span>
        </div>
        <div className="topbar-right">
          <span className={`conn ${health?.meko.ok ? "ok" : "down"}`}>
            <span className="conn-dot" />
            {health?.meko.ok ? `Meko ${health.meko.status} · ${health.meko.latencyMs} ms` : "Meko unreachable"}
          </span>
          <span className="chip">Synthetic fixtures</span>
          <span className="chip dark">Project ShiftRelay</span>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">ContextCon · shared memory for field support</p>
            <h1>
              The next shift starts with
              <br />
              what the last shift learned.
            </h1>
            <p>
              A technician approves a fix with its model, firmware and prerequisites. The next agent opens a
              fresh session, retrieves it from Meko, and shows why it applied or withheld it.
            </p>
          </div>
          <div className="hero-stats">
            <div>
              <strong>{approved}</strong>
              <span>approved fixes</span>
            </div>
            <div>
              <strong>{proposed}</strong>
              <span>awaiting approval</span>
            </div>
            <div>
              <strong>{withdrawn}</strong>
              <span>withdrawn</span>
            </div>
            <div>
              <strong>{state.cases.length}</strong>
              <span>synthetic cases</span>
            </div>
          </div>
        </section>

        <nav className="tabs" aria-label="Sections">
          {TABS.map((item, index) => (
            <button
              key={item.id}
              className={`tab ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <span className="tab-index">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
              {item.id === "review" && proposed > 0 ? <span className="count">{proposed}</span> : null}
            </button>
          ))}
        </nav>

        {tab === "intake" ? (
          <IntakePage
            state={state}
            selectedCaseId={selectedCaseId}
            onSelectCase={setSelectedCaseId}
            onNavigate={navigateToFresh}
            refresh={refresh}
            notify={notify}
          />
        ) : null}
        {tab === "review" ? <ReviewPage state={state} refresh={refresh} notify={notify} /> : null}
        {tab === "fresh" ? (
          <FreshSessionPage
            state={state}
            defaultCaseId={selectedCaseId}
            refresh={refresh}
            notify={notify}
          />
        ) : null}
        {tab === "evidence" ? <EvidencePage state={state} refresh={refresh} notify={notify} /> : null}
      </main>

      {toast ? (
        <div className={`toast ${toast.tone}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
