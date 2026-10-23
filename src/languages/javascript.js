/**
 * Strip quirúrgico de console.* para JS/TS/JSX/TSX.
 * Babel localiza rangos; se recorta el source original (sin regenerar).
 */

const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

const CONSOLE_METHODS = new Set([
  "log",
  "warn",
  "error",
  "info",
  "debug",
  "trace",
  "table",
  "dir",
  "assert",
  "time",
  "timeEnd",
  "timeLog",
  "group",
  "groupCollapsed",
  "groupEnd",
  "count",
  "countReset",
  "clear",
  "profile",
  "profileEnd",
]);

function isConsoleCall(node) {
  if (!t.isCallExpression(node)) return false;
  const callee = node.callee;
  if (!t.isMemberExpression(callee)) return false;
  if (!t.isIdentifier(callee.object, { name: "console" })) return false;

  if (
    t.isIdentifier(callee.property) &&
    CONSOLE_METHODS.has(callee.property.name)
  ) {
    return true;
  }
  if (
    callee.computed &&
    t.isStringLiteral(callee.property) &&
    CONSOLE_METHODS.has(callee.property.value)
  ) {
    return true;
  }
  return false;
}

function expandStatementEnd(source, end) {
  let i = end;
  while (i < source.length && (source[i] === " " || source[i] === "\t")) i++;
  if (source[i] === ";") i++;
  if (source[i] === "\r") i++;
  if (source[i] === "\n") i++;
  return i;
}

function expandStatementStart(source, start) {
  let i = start;
  while (i > 0 && (source[i - 1] === " " || source[i - 1] === "\t")) i--;
  return i;
}

/**
 * @param {string} source
 * @param {{ plugins?: string[] }} lang
 * @returns {{ source: string, removed: number, edits: { start: number, end: number, method: string, preview: string }[] }}
 */
function stripAstConsole(source, lang = {}) {
  if (!/\bconsole\s*\./.test(source)) {
    return { source, removed: 0, edits: [] };
  }

  const plugins = [
    ...(lang.plugins || []),
    "classProperties",
    "decorators-legacy",
    "dynamicImport",
    "optionalChaining",
    "nullishCoalescingOperator",
    "topLevelAwait",
  ];

  const ast = parser.parse(source, {
    sourceType: "module",
    ranges: true,
    errorRecovery: false,
    plugins: [...new Set(plugins)],
  });

  /** @type {{ start: number, end: number, replacement: string, method: string }[]} */
  const edits = [];

  traverse(ast, {
    CallExpression(path) {
      if (!isConsoleCall(path.node)) return;
      if (path.node.start == null || path.node.end == null) return;

      const prop = path.node.callee.property;
      const method = t.isIdentifier(prop)
        ? prop.name
        : t.isStringLiteral(prop)
          ? prop.value
          : "unknown";

      const parent = path.parentPath;

      if (parent.isExpressionStatement()) {
        const stmt = parent.node;
        if (stmt.start == null || stmt.end == null) return;
        edits.push({
          start: expandStatementStart(source, stmt.start),
          end: expandStatementEnd(source, stmt.end),
          replacement: "",
          method,
        });
        return;
      }

      if (
        parent.isUnaryExpression({ operator: "void" }) &&
        parent.parentPath.isExpressionStatement()
      ) {
        const stmt = parent.parentPath.node;
        if (stmt.start == null || stmt.end == null) return;
        edits.push({
          start: expandStatementStart(source, stmt.start),
          end: expandStatementEnd(source, stmt.end),
          replacement: "",
          method,
        });
        return;
      }

      if (parent.isLogicalExpression()) {
        const logical = parent.node;
        if (logical.start == null || logical.end == null) return;
        const other =
          logical.left === path.node ? logical.right : logical.left;
        if (other.start == null || other.end == null) return;
        edits.push({
          start: logical.start,
          end: logical.end,
          replacement: source.slice(other.start, other.end),
          method,
        });
        return;
      }

      edits.push({
        start: path.node.start,
        end: path.node.end,
        replacement: "undefined",
        method,
      });
    },
  });

  if (edits.length === 0) {
    return { source, removed: 0, edits: [] };
  }

  edits.sort((a, b) => b.start - a.start);

  const applied = [];
  for (const edit of edits) {
    const overlaps = applied.some(
      (e) => !(edit.end <= e.start || edit.start >= e.end)
    );
    if (overlaps) continue;
    applied.push(edit);
  }

  let next = source;
  const reportEdits = [];
  for (const edit of applied) {
    const preview = source
      .slice(edit.start, Math.min(edit.end, edit.start + 120))
      .replace(/\s+/g, " ")
      .trim();
    reportEdits.push({
      start: edit.start,
      end: edit.end,
      method: edit.method,
      preview,
    });
    next =
      next.slice(0, edit.start) + edit.replacement + next.slice(edit.end);
  }

  // reportEdits en orden de aparición en archivo
  reportEdits.sort((a, b) => a.start - b.start);

  return {
    source: next,
    removed: applied.length,
    edits: reportEdits,
  };
}

module.exports = { stripAstConsole, CONSOLE_METHODS };
