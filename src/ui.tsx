import type { ReactNode } from "react";
import type { FixStatus, DecisionOutcome } from "../shared/types";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "teal";
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: FixStatus }) {
  const tone = status === "approved" ? "green" : status === "withdrawn" ? "red" : status === "superseded" ? "amber" : "blue";
  return <Badge tone={tone}>{status}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: DecisionOutcome }) {
  const label =
    outcome === "recommended"
      ? "Recommended"
      : outcome === "withheld"
        ? "Withheld"
        : outcome === "question"
          ? "Question"
          : "No fix";
  const tone = outcome === "recommended" ? "green" : outcome === "withheld" ? "red" : outcome === "question" ? "amber" : "neutral";
  return <span className={`outcome outcome-${tone}`}>{label}</span>;
}

export function CheckIcon({ outcome }: { outcome: "pass" | "fail" | "question" | "info" }) {
  const glyph = outcome === "pass" ? "✓" : outcome === "fail" ? "×" : outcome === "question" ? "?" : "i";
  return <span className={`check-icon check-${outcome}`}>{glyph}</span>;
}

export function SectionTitle({
  eyebrow,
  title,
  aside,
}: {
  eyebrow?: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function shortId(value: string | null | undefined, length = 10): string {
  if (!value) return "—";
  return value.length <= length ? value : `${value.slice(0, length)}…`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
