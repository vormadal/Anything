// @ts-check
// Copies the tesseract.js worker and WASM core builds from node_modules into
// public/tesseract so OCR runs against same-origin assets (no CDN). The copies
// are gitignored; this runs via the predev/prebuild npm hooks so they always
// match the installed tesseract.js version.
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, copyFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const nodeModules = join(__dirname, "../node_modules");
const targetDir = join(__dirname, "../public/tesseract");

mkdirSync(targetDir, { recursive: true });

const assets = [
  // Web worker entry point (workerPath)
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  // Recognition-only (LSTM) cores; the worker picks one based on the
  // browser's SIMD support when corePath points at this directory.
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  [
    "tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ],
];

for (const [source, target] of assets) {
  copyFileSync(join(nodeModules, source), join(targetDir, target));
  console.log(`Copied: public/tesseract/${target}`);
}
