/**
 * Registro de lenguajes.
 * Solo se procesan archivos cuyo "console.*" sea sintaxis real del lenguaje.
 * Lenguajes sin console.* nativo se listan como unsupported (skip).
 */

const javascript = require("./javascript");

/** @typedef {{ id: string, label: string, extensions: string[], strategy: 'ast-console' | 'skip', reason?: string, plugins?: string[] }} LangDef */

/** @type {LangDef[]} */
const LANGUAGES = [
  {
    id: "javascript",
    label: "JavaScript",
    extensions: [".js", ".mjs", ".cjs", ".jsx"],
    strategy: "ast-console",
    plugins: ["jsx"],
  },
  {
    id: "typescript",
    label: "TypeScript",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
    strategy: "ast-console",
    plugins: ["jsx", "typescript"],
  },
  // Misma familia sintáctica (console.log) en bloques <script> — v1: skip SFC completo
  {
    id: "vue",
    label: "Vue SFC",
    extensions: [".vue"],
    strategy: "skip",
    reason: "Vue SFC: usar extracción de <script> en v2; por ahora skip seguro",
  },
  {
    id: "svelte",
    label: "Svelte",
    extensions: [".svelte"],
    strategy: "skip",
    reason: "Svelte SFC: skip seguro hasta extractor dedicado",
  },
  // Parecidos pero NO son console.* — no tocar
  {
    id: "python",
    label: "Python",
    extensions: [".py", ".pyw"],
    strategy: "skip",
    reason: "Python usa print()/logging, no console.*",
  },
  {
    id: "dart",
    label: "Dart",
    extensions: [".dart"],
    strategy: "skip",
    reason: "Dart usa print()/debugPrint(), no console.*",
  },
  {
    id: "csharp",
    label: "C#",
    extensions: [".cs"],
    strategy: "skip",
    reason: "C# usa Console.WriteLine, no console.log",
  },
  {
    id: "java",
    label: "Java",
    extensions: [".java"],
    strategy: "skip",
    reason: "Java usa System.out.println, no console.*",
  },
  {
    id: "kotlin",
    label: "Kotlin",
    extensions: [".kt", ".kts"],
    strategy: "skip",
    reason: "Kotlin usa println()/Log, no console.*",
  },
  {
    id: "swift",
    label: "Swift",
    extensions: [".swift"],
    strategy: "skip",
    reason: "Swift usa print(), no console.*",
  },
  {
    id: "go",
    label: "Go",
    extensions: [".go"],
    strategy: "skip",
    reason: "Go usa fmt.Println/log, no console.*",
  },
  {
    id: "ruby",
    label: "Ruby",
    extensions: [".rb"],
    strategy: "skip",
    reason: "Ruby usa puts/p, no console.*",
  },
  {
    id: "php",
    label: "PHP",
    extensions: [".php"],
    strategy: "skip",
    reason: "PHP usa echo/var_dump; console.* no es nativo",
  },
];

const byExt = new Map();
for (const lang of LANGUAGES) {
  for (const ext of lang.extensions) {
    byExt.set(ext.toLowerCase(), lang);
  }
}

function detectLanguage(filePath) {
  const ext = require("path").extname(filePath).toLowerCase();
  return byExt.get(ext) || null;
}

function listSupported() {
  return LANGUAGES.filter((l) => l.strategy !== "skip");
}

function listAll() {
  return LANGUAGES;
}

module.exports = {
  LANGUAGES,
  detectLanguage,
  listSupported,
  listAll,
  strategies: {
    "ast-console": javascript.stripAstConsole,
  },
};
