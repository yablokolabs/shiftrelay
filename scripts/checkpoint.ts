/**
 * Upload sanitized milestone checkpoints to the Meko `shiftrelay` datapack.
 * Refuses env files, redacts key/email patterns, and records only the hash.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { env } from "../server/config.js";
import { mekoRest } from "../server/meko/rest.js";

const files = process.argv.slice(2);
if (files.length === 0) files.push("docs/PROGRESS.md");
const datapackId = env.mekoDatapackId;
if (!datapackId) throw new Error("MEKO_DATAPACK_ID missing");

function sanitize(text: string): string {
  return text
    .replace(/mko_tkn_[A-Za-z0-9_-]+/g, "[REDACTED_MEKO_KEY]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(MEKO_API_KEY|OPENROUTER_API_KEY)=\S+/g, "$1=[REDACTED]");
}

async function main() {
  const records: string[] = [];
  for (const file of files) {
    if (/(^|\/)\.env(\.|$)/.test(file)) {
      throw new Error(`Refusing to checkpoint secret file ${file}`);
    }
    if (!existsSync(file)) throw new Error(`Missing checkpoint file ${file}`);
    const body = Buffer.from(sanitize(readFileSync(file, "utf8")));
    const filename = `project-bank-shiftrelay/${new Date().toISOString().slice(0, 10)}-${basename(file)}`;
    const result = await mekoRest.putArtifact(datapackId, filename, body, "text/markdown");
    records.push(`| ${new Date().toISOString()} | ${filename} | ${result.content_hash} | ${result.size_bytes} |`);
    console.log(`checkpointed ${filename} -> ${result.content_hash}`);
  }
  const header = existsSync("docs/CHECKPOINTS.md")
    ? ""
    : "\n| At | Artifact | SHA-256 | Bytes |\n| --- | --- | --- | --- |\n";
  const existing = existsSync("docs/CHECKPOINTS.md") ? readFileSync("docs/CHECKPOINTS.md", "utf8") : "";
  writeFileSync("docs/CHECKPOINTS.md", `${existing}${header}${records.join("\n")}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
