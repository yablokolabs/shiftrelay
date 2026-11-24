import { spawn } from "node:child_process";

const children = [
  spawn("node_modules/.bin/tsx", ["watch", "server/index.ts"], { stdio: "inherit" }),
  spawn("node_modules/.bin/vite", ["--port", "5173"], { stdio: "inherit" }),
];

function stop(signal: NodeJS.Signals) {
  for (const child of children) child.kill(signal);
  process.exit(0);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      for (const other of children) other.kill("SIGTERM");
      process.exit(code);
    }
  });
}
