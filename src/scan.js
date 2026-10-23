const fs = require("fs");
const path = require("path");
const { detectLanguage } = require("./languages/registry");

const DEFAULT_IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "coverage",
  ".next",
  ".expo",
  ".turbo",
  ".cache",
  "android",
  "ios",
  "Pods",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "out",
  ".output",
]);

function shouldIgnoreDir(name, extraIgnore) {
  if (DEFAULT_IGNORE_DIR_NAMES.has(name)) return true;
  if (extraIgnore && extraIgnore.has(name)) return true;
  return false;
}

/**
 * Recorre root y devuelve archivos con lenguaje detectado.
 */
function scanProject(root, { extraIgnoreDirs = [] } = {}) {
  const extra = new Set(extraIgnoreDirs);
  const results = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (shouldIgnoreDir(entry.name, extra)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const lang = detectLanguage(full);
      if (!lang) continue;
      results.push({
        filePath: full,
        rel: path.relative(root, full).replace(/\\/g, "/"),
        language: lang,
      });
    }
  }

  walk(root);
  return results;
}

module.exports = { scanProject, DEFAULT_IGNORE_DIR_NAMES };
