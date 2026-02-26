const { execSync } = require("child_process");

const APP_NAME = process.env.APP_NAME;
const CAPROVER_URL =
  process.env.CAPROVER_URL || "https://captain.caprover.vormadal.com";
const CAPROVER_PASSWORD = process.env.CAPROVER_PASSWORD;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "60", 10);
const RETRY_INTERVAL_MS = parseInt(
  process.env.RETRY_INTERVAL_MS || "10000",
  10
);

if (!APP_NAME || !CAPROVER_PASSWORD) {
  console.error("APP_NAME and CAPROVER_PASSWORD environment variables are required");
  process.exit(1);
}

function fetchAppDefinition() {
  const output = execSync(
    `caprover api --caproverUrl ${CAPROVER_URL} ` +
      `--caproverPassword ${CAPROVER_PASSWORD} ` +
      `--path /user/apps/appDefinitions --method GET --data "{}"`,
    { encoding: "utf-8" }
  );

  const json = output.substring(output.indexOf("{"));
  const response = JSON.parse(json);
  const app = response.appDefinitions.find((a) => a.appName === APP_NAME);

  if (!app) {
    throw new Error(`App "${APP_NAME}" not found on CapRover`);
  }

  return {
    deployedVersion: app.deployedVersion,
    latestVersion: app.versions[app.versions.length - 1].version,
    isBuilding: app.isAppBuilding,
  };
}

async function waitForDeploy() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { deployedVersion, latestVersion, isBuilding } =
      fetchAppDefinition();

    if (deployedVersion === latestVersion) {
      console.log(`Deploy successful (version ${deployedVersion})`);
      return;
    }

    if (!isBuilding) {
      console.error(
        `Deploy failed. Deployed: ${deployedVersion}, Latest: ${latestVersion}. Check CapRover logs for details.`
      );
      process.exit(1);
    }

    console.log(
      `[${attempt}/${MAX_RETRIES}] Building... (deployed: ${deployedVersion}, latest: ${latestVersion})`
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
  }

  console.error(
    `Timed out after ${MAX_RETRIES} attempts waiting for deploy to complete`
  );
  process.exit(1);
}

waitForDeploy();
