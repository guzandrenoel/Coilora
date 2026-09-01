import { cp, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageDirectory = path.dirname(
  require.resolve("pdfjs-dist/package.json"),
);
const { version } = JSON.parse(
  await readFile(path.join(packageDirectory, "package.json"), "utf8"),
);
if (!/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("Unsupported PDF.js version.");

const webDirectory = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(webDirectory, "public", "pdfjs", version);
await mkdir(destination, { recursive: true });

const assets = [
  ["build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["cmaps", "cmaps"],
  ["standard_fonts", "standard_fonts"],
  ["wasm", "wasm"],
  ["iccs", "iccs"],
  ["LICENSE", "LICENSE"],
];
await Promise.all(
  assets.map(([source, target]) =>
    cp(path.join(packageDirectory, source), path.join(destination, target), {
      recursive: true,
    }),
  ),
);
console.log(`Prepared local PDF.js ${version} assets.`);
