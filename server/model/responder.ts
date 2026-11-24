import type { CaseRecord, DecisionEvidence } from "../../shared/types.js";
import { env } from "../config.js";

/**
 * Static-manual fallback used identically by both evaluation arms when no
 * approved shared fix is available. The manual is the same text in both arms.
 */
export function baselineAnswer(caseRecord: CaseRecord): string {
  const firmware = caseRecord.firmware ? `firmware ${caseRecord.firmware}` : "firmware not recorded";
  return [
    `No approved shared fix applies to ${caseRecord.model} (${firmware}).`,
    "Follow the static P-series manual: confirm the model and firmware, print the built-in test pattern, check media and ribbon, run the print-head cleaning cycle, and record the result.",
    "If faint print or the mechanical symptom continues, attach the test pattern, page count, and steps tried, then escalate to the next shift.",
  ].join(" ");
}

export interface ModelAnswer {
  text: string;
  responder: string;
}

/**
 * Optional server-side model adapter. It is disabled unless the operator
 * supplies a model key. The deterministic decision is never delegated: the
 * model may only phrase the already-decided outcome.
 */
export async function composeAnswer(
  caseRecord: CaseRecord,
  evidence: DecisionEvidence,
  manual: string,
): Promise<ModelAnswer> {
  if (env.modelProvider !== "openrouter" || !env.openRouterApiKey) {
    return {
      text: evidence.answer,
      responder: "deterministic-rules-v1",
    };
  }
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You phrase a field-support answer. You must obey the supplied decision. Never recommend a withheld fix, never fill in a missing firmware, and never change the outcome.",
          },
          {
            role: "user",
            content: [
              `Case: ${caseRecord.model}, firmware ${caseRecord.firmware ?? "missing"}. ${caseRecord.symptom}`,
              `Decision: ${evidence.outcome}. ${evidence.headline}.`,
              `Checks: ${evidence.checks.map((check) => `${check.label}: ${check.outcome} (${check.detail})`).join(" ")}`,
              `Approved steps: ${evidence.steps.join(" ") || "none"}`,
              `Static manual: ${manual}`,
            ].join("\n"),
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`model HTTP ${response.status}`);
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("model returned no content");
    return { text, responder: `openrouter:${env.openRouterModel}` };
  } catch {
    return { text: evidence.answer, responder: "deterministic-rules-v1" };
  }
}
