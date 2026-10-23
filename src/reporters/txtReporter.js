const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Escribe reportes TXT en outDir.
 * @returns {{ summaryPath: string, detailPath: string, skippedPath: string }}
 */
function writeReports(outDir, payload) {
  ensureDir(outDir);
  const id = stamp();
  const mode = payload.dry ? "dry" : "apply";

  const summaryPath = path.join(outDir, `strip-console-${mode}-summary-${id}.txt`);
  const detailPath = path.join(outDir, `strip-console-${mode}-detail-${id}.txt`);
  const skippedPath = path.join(outDir, `strip-console-${mode}-skipped-${id}.txt`);

  const lines = [];
  lines.push(`strip-console report (${mode})`);
  lines.push(`generated: ${new Date().toISOString()}`);
  lines.push(`root: ${payload.root}`);
  lines.push(`dry: ${payload.dry}`);
  lines.push("");
  lines.push(`files scanned: ${payload.scanned}`);
  lines.push(`files changed: ${payload.changed}`);
  lines.push(`console.* removed: ${payload.removed}`);
  lines.push(`parse errors: ${payload.errors}`);
  lines.push(`skipped (unsupported lang / no console): ${payload.skipped.length}`);
  lines.push("");
  lines.push("by language:");
  for (const [lang, stats] of Object.entries(payload.byLanguage)) {
    lines.push(
      `  ${lang}: files=${stats.files} removed=${stats.removed} skipped=${stats.skipped}`
    );
  }
  lines.push("");
  lines.push("changed files:");
  for (const f of payload.files) {
    if (f.removed > 0) {
      lines.push(`  [${f.language}] ${f.rel}: -${f.removed}`);
    }
  }
  fs.writeFileSync(summaryPath, lines.join("\n") + "\n", "utf8");

  const detail = [];
  detail.push(`strip-console DETAIL (${mode}) — ${new Date().toISOString()}`);
  detail.push(`root: ${payload.root}`);
  detail.push("");
  for (const f of payload.files) {
    if (!f.edits || f.edits.length === 0) continue;
    detail.push("=".repeat(72));
    detail.push(`[${f.language}] ${f.rel}`);
    detail.push(`removed: ${f.removed}`);
    detail.push("-".repeat(72));
    for (const e of f.edits) {
      detail.push(`  console.${e.method} @ ${e.start}-${e.end}`);
      detail.push(`    ${e.preview}`);
    }
    detail.push("");
  }
  fs.writeFileSync(detailPath, detail.join("\n") + "\n", "utf8");

  const skipped = [];
  skipped.push(`strip-console SKIPPED (${mode}) — ${new Date().toISOString()}`);
  skipped.push("");
  for (const s of payload.skipped) {
    skipped.push(`[${s.language || "unknown"}] ${s.rel}`);
    skipped.push(`  reason: ${s.reason}`);
    skipped.push("");
  }
  fs.writeFileSync(skippedPath, skipped.join("\n") + "\n", "utf8");

  return { summaryPath, detailPath, skippedPath };
}

module.exports = { writeReports, stamp };
