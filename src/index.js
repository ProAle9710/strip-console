const fs = require("fs");
const path = require("path");
const { scanProject } = require("./scan");
const { strategies } = require("./languages/registry");
const { writeReports } = require("./reporters/txtReporter");

/**
 * @param {{
 *   root: string,
 *   dry?: boolean,
 *   reportDir?: string,
 *   extraIgnoreDirs?: string[],
 *   quiet?: boolean,
 * }} options
 */
function runStripConsole(options) {
  const root = path.resolve(options.root);
  const dry = Boolean(options.dry);
  const quiet = Boolean(options.quiet);
  const reportDir =
    options.reportDir ||
    path.join(root, ".strip-console-reports");

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Root no válido: ${root}`);
  }

  const scanned = scanProject(root, {
    extraIgnoreDirs: options.extraIgnoreDirs || [],
  });

  const payload = {
    root,
    dry,
    scanned: scanned.length,
    changed: 0,
    removed: 0,
    errors: 0,
    byLanguage: {},
    files: [],
    skipped: [],
  };

  const bumpLang = (id, field, n = 1) => {
    if (!payload.byLanguage[id]) {
      payload.byLanguage[id] = { files: 0, removed: 0, skipped: 0 };
    }
    payload.byLanguage[id][field] += n;
  };

  for (const item of scanned) {
    const { filePath, rel, language: lang } = item;

    if (lang.strategy === "skip") {
      // Solo reportar skip si el archivo menciona console. (posible falso positivo)
      const raw = fs.readFileSync(filePath, "utf8");
      if (/\bconsole\s*\./.test(raw)) {
        payload.skipped.push({
          rel,
          language: lang.id,
          reason: lang.reason || "unsupported strategy",
        });
        bumpLang(lang.id, "skipped");
      }
      continue;
    }

    const stripFn = strategies[lang.strategy];
    if (!stripFn) {
      payload.skipped.push({
        rel,
        language: lang.id,
        reason: `strategy no implementada: ${lang.strategy}`,
      });
      bumpLang(lang.id, "skipped");
      continue;
    }

    let source;
    try {
      source = fs.readFileSync(filePath, "utf8");
    } catch (err) {
      payload.errors += 1;
      payload.skipped.push({
        rel,
        language: lang.id,
        reason: `read error: ${err.message}`,
      });
      continue;
    }

    if (!/\bconsole\s*\./.test(source)) {
      continue;
    }

    let result;
    try {
      result = stripFn(source, lang);
    } catch (err) {
      payload.errors += 1;
      payload.skipped.push({
        rel,
        language: lang.id,
        reason: `parse/strip error: ${err.message}`,
      });
      bumpLang(lang.id, "skipped");
      if (!quiet) {
        console.error(`[error] ${rel}: ${err.message}`);
      }
      continue;
    }

    if (result.removed === 0) {
      continue;
    }

    if (!dry && result.source !== source) {
      fs.writeFileSync(filePath, result.source, "utf8");
    }

    payload.changed += 1;
    payload.removed += result.removed;
    bumpLang(lang.id, "files");
    bumpLang(lang.id, "removed", result.removed);

    payload.files.push({
      rel,
      language: lang.id,
      removed: result.removed,
      edits: result.edits,
    });

    if (!quiet) {
      console.log(
        `${dry ? "[dry] " : ""}${rel} [${lang.id}]: -${result.removed} console.*`
      );
    }
  }

  const reports = writeReports(reportDir, payload);

  if (!quiet) {
    console.log("");
    console.log(
      `${dry ? "DRY RUN — " : ""}Archivos tocados: ${payload.changed}, eliminados: ${payload.removed}, errores: ${payload.errors}`
    );
    console.log(`Reportes:`);
    console.log(`  summary: ${reports.summaryPath}`);
    console.log(`  detail:  ${reports.detailPath}`);
    console.log(`  skipped: ${reports.skippedPath}`);
  }

  return { ...payload, reports };
}

module.exports = { runStripConsole };
