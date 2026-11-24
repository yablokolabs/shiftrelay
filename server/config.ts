import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Minimal .env loader. The app reads optional project-local env files only;
 * deployment secrets stay in the environment, never in source or exports.
 */
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

for (const file of [".env.local", ".env"]) {
  loadEnvFile(resolve(process.cwd(), file));
}

export const env = {
  mekoApiKey: process.env.MEKO_API_KEY ?? "",
  mekoMcpUrl: process.env.MEKO_MCP_URL ?? "https://mcp.mekodata.ai/mcp",
  mekoApiBase: process.env.MEKO_API_BASE ?? "https://api.mekodata.ai/api/v1",
  mekoDatapackId: process.env.MEKO_DATAPACK_ID ?? "",
  mekoEvalBaselineDatapackId: process.env.MEKO_EVAL_BASELINE_DATAPACK_ID ?? "",
  mekoEvalTreatmentDatapackId: process.env.MEKO_EVAL_TREATMENT_DATAPACK_ID ?? "",
  mekoProjectId: process.env.MEKO_PROJECT_ID ?? "",
  mekoProjectFieldFolderId: process.env.MEKO_PROJECT_FIELD_FOLDER_ID ?? "",
  mekoProjectEvalFolderId: process.env.MEKO_PROJECT_EVAL_FOLDER_ID ?? "",
  port: Number(process.env.PORT ?? 8787),
  modelProvider: process.env.MODEL_PROVIDER ?? "deterministic",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
};

export function requireMekoKey(): string {
  if (!env.mekoApiKey) {
    throw new Error(
      "MEKO_API_KEY is not set. Put it in .env (gitignored) or the process environment.",
    );
  }
  return env.mekoApiKey;
}

export function requireDatapackId(value?: string): string {
  const id = value || env.mekoDatapackId;
  if (!id) {
    throw new Error(
      "MEKO_DATAPACK_ID is not set. Run `npm run seed` or set the datapack id in .env.",
    );
  }
  return id;
}
