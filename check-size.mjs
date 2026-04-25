import { statSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL(".", import.meta.url).pathname;

const TARGET_FILES = [
  "index.html",
  "style.css",
  "core.js",
  "components.js",
  "app.js",
  "game-data.json",
];

const ASSET_DIRS = ["images", "audio", "vendor"];
const ASSET_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp3", ".wav", ".ogg", ".js", ".css"]);

const KB = 1024;
const MB = KB * 1024;

function formatBytes(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(2)} KB`;
  return `${bytes} B`;
}

function walk(dir) {
  let total = 0;
  let count = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!ASSET_EXT.has(extname(entry.name).toLowerCase())) continue;
      const size = statSync(full).size;
      total += size;
      count += 1;
    }
  }
  return { total, count };
}

function sumGameFiles() {
  const rows = [];
  let total = 0;
  for (const rel of TARGET_FILES) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const size = statSync(abs).size;
    rows.push({ rel, size });
    total += size;
  }
  return { rows, total };
}

function sumAssets() {
  const rows = [];
  let total = 0;
  let count = 0;
  for (const rel of ASSET_DIRS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const result = walk(abs);
    rows.push({ rel, ...result });
    total += result.total;
    count += result.count;
  }
  return { rows, total, count };
}

function evaluate(sourceBytes, assetBytes) {
  const warnings = [];
  if (sourceBytes > 450 * KB) warnings.push("Source files are over 450KB.");
  if (assetBytes > 8 * MB) warnings.push("Asset files are over 8MB.");
  return warnings;
}

function main() {
  const source = sumGameFiles();
  const assets = sumAssets();
  const warnings = evaluate(source.total, assets.total);

  console.log("=== 147-RPG Size Check ===");
  console.log("");
  console.log("[Source files]");
  source.rows.forEach((r) => {
    console.log(`- ${r.rel.padEnd(16)} ${formatBytes(r.size)}`);
  });
  console.log(`Total source: ${formatBytes(source.total)}`);
  console.log("");

  console.log("[Asset directories]");
  assets.rows.forEach((r) => {
    console.log(`- ${r.rel.padEnd(16)} ${formatBytes(r.total)} (${r.count} files)`);
  });
  console.log(`Total assets: ${formatBytes(assets.total)} (${assets.count} files)`);
  console.log("");

  if (warnings.length === 0) {
    console.log("Result: PASS (size is within target budget)");
    process.exit(0);
  }

  console.log("Result: WARN");
  warnings.forEach((w) => console.log(`- ${w}`));
  process.exit(0);
}

main();
