// Generic CapRover deploy verifier.
//
// CapRover only guarantees that a Docker *image* built and was handed to the
// service - it does not know whether the process inside the container ever
// came up. A container that crashes right after start (e.g. a failed DB
// migration) still reports a successful "deploy" from CapRover's point of
// view. This script closes that gap:
//
//   1. Poll CapRover until the build finishes (existing behaviour).
//   2. Poll the app's own HTTP endpoint until it actually responds, so a
//      build that "succeeded" but produced a crash-looping container is
//      still caught.
//   3. On any failure, fetch and print both the CapRover build logs and the
//      live container logs, so everything needed to diagnose the failure is
//      already in the workflow output - no manual CapRover login required.
//
// Only depends on the `caprover` CLI being on PATH and Node's built-in
// `fetch`. Fully driven by env vars, so it can be dropped into any
// CapRover-deploying workflow via the sibling action.yml.

const { spawnSync } = require("child_process");

const APP_NAME = process.env.APP_NAME;
const CAPROVER_URL =
  process.env.CAPROVER_URL || "https://captain.caprover.vormadal.com";
const CAPROVER_PASSWORD = process.env.CAPROVER_PASSWORD;

const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "60", 10);
const RETRY_INTERVAL_MS = parseInt(
  process.env.RETRY_INTERVAL_MS || "10000",
  10
);

const SKIP_HEALTH_CHECK = process.env.SKIP_HEALTH_CHECK === "true";
const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || "";
const HEALTH_CHECK_PATH = process.env.HEALTH_CHECK_PATH || "/health";
const HEALTH_CHECK_MAX_RETRIES = parseInt(
  process.env.HEALTH_CHECK_MAX_RETRIES || "30",
  10
);
const HEALTH_CHECK_RETRY_INTERVAL_MS = parseInt(
  process.env.HEALTH_CHECK_RETRY_INTERVAL_MS || "5000",
  10
);
const HEALTH_CHECK_TIMEOUT_MS = parseInt(
  process.env.HEALTH_CHECK_TIMEOUT_MS || "10000",
  10
);

if (!APP_NAME || !CAPROVER_PASSWORD) {
  console.error(
    "APP_NAME and CAPROVER_PASSWORD environment variables are required"
  );
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calls the CapRover HTTP API via the `caprover` CLI (already on PATH in
// this workflow) and returns the parsed `data` field of the response.
function callCaproverApi(path, method, data) {
  const args = [
    "api",
    "--caproverUrl",
    CAPROVER_URL,
    "--caproverPassword",
    CAPROVER_PASSWORD,
    "--path",
    path,
    "--method",
    method || "GET",
    // The `caprover` CLI's `api` command prompts interactively for this
    // value when it's omitted (no `when: false` guard on it), which fails
    // immediately in non-interactive CI. Always pass it explicitly, even
    // when there's nothing to send, so the call never falls back to a
    // prompt.
    "--data",
    JSON.stringify(data ?? {}),
  ];

  const result = spawnSync("caprover", args, { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `caprover api ${method || "GET"} ${path} failed: ${
        (result.stderr || result.stdout || "").trim()
      }`
    );
  }

  const output = result.stdout;
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(`Unexpected caprover api output for ${path}: ${output}`);
  }
  return JSON.parse(output.substring(jsonStart));
}

function fetchAppDefinition() {
  const response = callCaproverApi("/user/apps/appDefinitions", "GET");
  const app = response.appDefinitions.find((a) => a.appName === APP_NAME);

  if (!app) {
    throw new Error(`App "${APP_NAME}" not found on CapRover`);
  }

  return app;
}

async function waitForBuild() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const app = fetchAppDefinition();
    const latestVersion = app.versions[app.versions.length - 1].version;

    if (app.deployedVersion === latestVersion) {
      console.log(`Build deployed successfully (version ${app.deployedVersion})`);
      return app;
    }

    if (!app.isAppBuilding) {
      throw new Error(
        `Deploy failed. Deployed: ${app.deployedVersion}, Latest: ${latestVersion}.`
      );
    }

    console.log(
      `[${attempt}/${MAX_RETRIES}] Building... (deployed: ${app.deployedVersion}, latest: ${latestVersion})`
    );
    await sleep(RETRY_INTERVAL_MS);
  }

  throw new Error(
    `Timed out after ${MAX_RETRIES} attempts waiting for build to complete`
  );
}

// Mirrors how the `caprover` CLI itself prints the app URL after a deploy:
// swap the "captain." admin subdomain for the app name, unless a custom
// domain is configured for the app.
function deriveAppUrl(app) {
  if (app.customDomain && app.customDomain.length > 0) {
    const domain =
      app.customDomain.find((d) => d.hasSsl) || app.customDomain[0];
    return `${domain.hasSsl ? "https" : "http"}://${domain.publicDomain}`;
  }

  const url = new URL(CAPROVER_URL);
  url.hostname = url.hostname.replace(/^captain\./, `${APP_NAME}.`);
  url.protocol = app.hasDefaultSubDomainSsl ? "https:" : "http:";
  return url.toString().replace(/\/$/, "");
}

async function waitForHealthy(url) {
  console.log(`Verifying startup at ${url} ...`);

  let lastError;
  for (let attempt = 1; attempt <= HEALTH_CHECK_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        HEALTH_CHECK_TIMEOUT_MS
      );
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          console.log(`App responded ${res.status} at ${url} - startup verified.`);
          return;
        }
        lastError = new Error(`received HTTP ${res.status}`);
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      lastError = err;
    }

    console.log(
      `[${attempt}/${HEALTH_CHECK_MAX_RETRIES}] App not healthy yet (${lastError.message}), retrying...`
    );
    await sleep(HEALTH_CHECK_RETRY_INTERVAL_MS);
  }

  throw new Error(
    `App did not become healthy at ${url} after ${HEALTH_CHECK_MAX_RETRIES} attempts: ${lastError.message}`
  );
}

function printBuildLogs() {
  console.log("\n--- CapRover build logs (" + APP_NAME + ") ---");
  try {
    const data = callCaproverApi(`/user/apps/appData/${APP_NAME}`, "GET");
    const lines = (data.logs && data.logs.lines) || [];
    console.log(
      lines.map((l) => (l || "").trim()).join("\n") ||
        "(no build logs available)"
    );
  } catch (err) {
    console.error(`Could not fetch build logs: ${err.message}`);
  }
}

// CapRover's runtime log endpoint returns the raw hex-encoded Docker
// multiplexed stdout/stderr stream: each frame is an 8-byte header
// (1 byte stream type, 3 reserved bytes, 4-byte big-endian payload length)
// followed by the payload. Falls back to treating the remainder as plain
// text if a frame header ever looks bogus (e.g. TTY-allocated containers
// stream raw bytes without this framing).
function decodeDockerHexLogs(hex) {
  if (!hex) {
    return "";
  }

  const buf = Buffer.from(hex, "hex");
  const chunks = [];
  let i = 0;
  while (i < buf.length) {
    if (i + 8 > buf.length || buf[i] > 3) {
      chunks.push(buf.slice(i).toString("utf-8"));
      break;
    }
    const size = buf.readUInt32BE(i + 4);
    const payloadStart = i + 8;
    const payloadEnd = Math.min(payloadStart + size, buf.length);
    chunks.push(buf.slice(payloadStart, payloadEnd).toString("utf-8"));
    i = payloadEnd;
  }
  return chunks.join("");
}

function printRuntimeLogs() {
  console.log("\n--- CapRover container (runtime) logs (" + APP_NAME + ") ---");
  try {
    const data = callCaproverApi(`/user/apps/appData/${APP_NAME}/logs`, "GET", {
      encoding: "hex",
    });
    console.log(decodeDockerHexLogs(data.logs) || "(no runtime logs available)");
  } catch (err) {
    console.error(`Could not fetch runtime logs: ${err.message}`);
  }
}

function printDiagnostics() {
  printBuildLogs();
  printRuntimeLogs();
}

async function main() {
  let app;
  try {
    app = await waitForBuild();
  } catch (err) {
    console.error(err.message);
    printDiagnostics();
    process.exit(1);
  }

  if (SKIP_HEALTH_CHECK) {
    console.log("Skipping HTTP startup check (SKIP_HEALTH_CHECK=true).");
    return;
  }

  if (app.notExposeAsWebApp) {
    console.log(
      "Skipping HTTP startup check (app is not exposed as a web app)."
    );
    return;
  }

  const url = HEALTH_CHECK_URL || deriveAppUrl(app) + HEALTH_CHECK_PATH;
  try {
    await waitForHealthy(url);
  } catch (err) {
    console.error(err.message);
    printDiagnostics();
    process.exit(1);
  }
}

main();
