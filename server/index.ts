import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { env } from "./config.js";
import { controlStore, ControlError } from "./store/control.js";
import {
  approveFix,
  captureCase,
  diagnoseCase,
  listDecisionEvidence,
  proposeFix,
  withdrawFix,
} from "./meko/service.js";
import { mekoRest } from "./meko/rest.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

const caseSchema = z.object({
  title: z.string().min(3).max(120),
  model: z.string().min(2).max(40),
  firmware: z.string().max(40).nullable().optional(),
  symptom: z.string().min(10).max(1000),
  site: z.string().max(120).optional(),
  prerequisitesMet: z.array(z.string().max(160)).max(12).optional(),
  transcript: z
    .array(
      z.object({
        role: z.enum(["technician", "intake", "system"]),
        text: z.string().max(2000),
      }),
    )
    .max(20)
    .optional(),
});

const proposalSchema = z.object({
  fixId: z.string().max(80).optional(),
  version: z.number().int().min(1).max(99).optional(),
  sourceCaseId: z.string().min(3),
  symptom: z.string().min(5).max(1000),
  model: z.string().min(2).max(40),
  supportedFirmware: z.array(z.string().min(1).max(40)).min(1).max(12),
  prerequisites: z.array(z.string().max(200)).max(12),
  steps: z.array(z.string().min(3).max(500)).min(1).max(12),
  supersedes: z.string().max(100).nullable().optional(),
});

const approvalSchema = z.object({
  approver: z.string().min(2).max(120),
  expectedFixRevision: z.number().int().positive(),
  note: z.string().max(1000).optional(),
});

const withdrawalSchema = z.object({
  actor: z.string().min(2).max(120),
  expectedFixRevision: z.number().int().positive(),
  reason: z.string().min(5).max(1000),
});

function wrap(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

app.get(
  "/api/health",
  wrap(async (_req, res) => {
    const started = Date.now();
    let meko: { ok: boolean; status: string; latencyMs: number; error?: string };
    try {
      const health = await mekoRest.health();
      meko = { ok: health.status === "ok", status: health.status, latencyMs: Date.now() - started };
    } catch (error) {
      meko = {
        ok: false,
        status: "unreachable",
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    res.json({
      app: "shiftrelay",
      meko,
      datapacks: {
        primary: env.mekoDatapackId,
        baseline: env.mekoEvalBaselineDatapackId,
        project: env.mekoProjectId ?? null,
      },
      model: {
        provider: env.modelProvider,
        configured: env.modelProvider === "openrouter" && Boolean(env.openRouterApiKey),
      },
      controlRevision: controlStore.snapshot().revision,
    });
  }),
);

app.get("/api/state", (_req, res) => {
  const snapshot = controlStore.snapshot();
  res.json({
    ...snapshot,
    decisions: listDecisionEvidence(20),
    datapacks: {
      primary: env.mekoDatapackId,
      baseline: env.mekoEvalBaselineDatapackId,
      project: env.mekoProjectId ?? null,
    },
  });
});

app.post(
  "/api/cases",
  wrap(async (req, res) => {
    const input = caseSchema.parse(req.body);
    const record = await captureCase(input, "intake");
    res.status(201).json(record);
  }),
);

app.post(
  "/api/fixes",
  wrap(async (req, res) => {
    const input = proposalSchema.parse(req.body);
    const record = await proposeFix(input);
    res.status(201).json(record);
  }),
);

app.post(
  "/api/fixes/:fixId/versions/:version/approve",
  wrap(async (req, res) => {
    const input = approvalSchema.parse(req.body);
    const version = Number(req.params.version);
    if (!Number.isInteger(version)) throw new ControlError(400, "BAD_VERSION", "Version must be an integer.");
    const result = await approveFix(req.params.fixId, version, input);
    res.json(result);
  }),
);

app.post(
  "/api/fixes/:fixId/versions/:version/withdraw",
  wrap(async (req, res) => {
    const input = withdrawalSchema.parse(req.body);
    const version = Number(req.params.version);
    if (!Number.isInteger(version)) throw new ControlError(400, "BAD_VERSION", "Version must be an integer.");
    const result = await withdrawFix(req.params.fixId, version, input);
    res.json(result);
  }),
);

app.post(
  "/api/diagnose",
  wrap(async (req, res) => {
    const schema = z.object({
      caseId: z.string().min(3),
      arm: z.enum(["treatment", "baseline"]).default("treatment"),
    });
    const input = schema.parse(req.body);
    const datapackId =
      input.arm === "baseline" ? env.mekoEvalBaselineDatapackId : env.mekoDatapackId;
    if (!datapackId) throw new ControlError(400, "DATAPACK_MISSING", `No datapack configured for ${input.arm}.`);
    const evidence = await diagnoseCase(input.caseId, {
      datapackId,
      label: `${input.arm}-${Date.now()}`,
    });
    res.json(evidence);
  }),
);

app.get("/api/evidence", (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  res.json({ decisions: listDecisionEvidence(limit) });
});

app.get("/api/eval/latest", (_req, res) => {
  const path = resolve(process.cwd(), "docs/evidence/evaluation.json");
  if (!existsSync(path)) {
    res.json({ available: false });
    return;
  }
  const data = JSON.parse(readFileSync(path, "utf8"));
  res.json({ available: true, ...data });
});

app.post(
  "/api/eval/run",
  wrap(async (_req, res) => {
    const { runEvaluation } = await import("./eval/run.js");
    const result = await runEvaluation();
    res.json(result);
  }),
);

const dist = resolve(process.cwd(), "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: error.issues.map((issue) => issue.message).join("; ") },
    });
    return;
  }
  if (error instanceof ControlError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
});

app.listen(env.port, () => {
  console.log(`ShiftRelay server listening on http://localhost:${env.port}`);
});
