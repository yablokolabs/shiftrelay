import { runEvaluation } from "../server/eval/run.js";

const result = await runEvaluation();
console.log(JSON.stringify({ summary: result.summary, assertions: result.assertions }, null, 2));
const failed = Object.entries(result.assertions).filter(([, value]) => value !== true);
if (failed.length > 0) process.exitCode = 1;
