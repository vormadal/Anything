import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(__dirname, "..");
const FORBIDDEN = ["api", "Fetch"].join("");
const EXCLUDED_PATHS = [
  __filename,
  path.join(SRC_DIR, "lib", "api-client"), // auto-generated, never hand-edited
];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (EXCLUDED_PATHS.some((excluded) => fullPath === excluded || fullPath.startsWith(excluded + path.sep))) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test("apiFetch is not used anywhere in the frontend source", () => {
  const offenders = collectSourceFiles(SRC_DIR)
    .filter((file) => fs.readFileSync(file, "utf8").includes(FORBIDDEN))
    .map((file) => path.relative(SRC_DIR, file));

  expect(offenders).toEqual([]);
});
