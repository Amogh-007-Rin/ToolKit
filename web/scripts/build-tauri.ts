import { spawn } from "node:child_process";

const frontendUrl = process.env.TAURI_FRONTEND_URL;

if (!frontendUrl) {
  console.error("TAURI_FRONTEND_URL is required to package the desktop client.");
  console.error("Example: TAURI_FRONTEND_URL=https://your-toolkit-host.example bun run tauri:build");
  process.exit(1);
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(frontendUrl);
} catch {
  console.error(`TAURI_FRONTEND_URL is not a valid URL: ${frontendUrl}`);
  process.exit(1);
}

if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
  console.error("TAURI_FRONTEND_URL must use http:// or https://.");
  process.exit(1);
}

const configOverride = JSON.stringify({
  build: {
    frontendDist: parsedUrl.toString(),
    beforeBuildCommand: null,
  },
});

const extraArguments = process.argv.slice(2);
const build = spawn(
  "bunx",
  ["tauri", "build", "--ci", "--config", configOverride, ...extraArguments],
  { stdio: "inherit" },
);

const exitCode = await new Promise<number>((resolve) => {
  build.on("close", (code) => resolve(code ?? 1));
});

process.exit(exitCode);
