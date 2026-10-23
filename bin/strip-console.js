#!/usr/bin/env node
/**
 * CLI: strip-console
 *
 * Uso:
 *   node bin/strip-console.js <root> [--dry] [--report-dir <dir>] [--quiet]
 *   strip-console <root> --dry
 *
 * Ejemplos:
 *   strip-console D:\Work\PROD\mi-app --dry
 *   strip-console . --report-dir .\reports
 */

const path = require("path");
const { runStripConsole } = require("../src/index");
const { listSupported, listAll } = require("../src/languages/registry");

function printHelp() {
  console.log(`
@darkaegis/strip-console

Elimina console.* solo en lenguajes con esa sintaxis (JS/TS/JSX/TSX).
Detecta el lenguaje por extensión y aplica la estrategia exacta.

Uso:
  strip-console <root> [opciones]
  da-strip-console <root> [opciones]

Opciones:
  --dry              No escribe archivos; solo reporta
  --report-dir <dir> Carpeta de reportes TXT (default: <root>/.strip-console-reports)
  --ignore <name>    Carpeta extra a ignorar (repetible)
  --list-langs       Lista lenguajes conocidos
  --quiet            Menos salida en consola
  -h, --help         Ayuda

Lenguajes con strip activo:
${listSupported()
  .map((l) => `  - ${l.id}: ${l.extensions.join(", ")}`)
  .join("\n")}
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    root: null,
    dry: false,
    quiet: false,
    reportDir: null,
    extraIgnoreDirs: [],
    listLangs: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry") opts.dry = true;
    else if (a === "--quiet") opts.quiet = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--list-langs") opts.listLangs = true;
    else if (a === "--report-dir") opts.reportDir = args[++i];
    else if (a === "--ignore") opts.extraIgnoreDirs.push(args[++i]);
    else if (a.startsWith("-")) {
      console.error(`Opción desconocida: ${a}`);
      process.exit(1);
    } else if (!opts.root) opts.root = a;
    else {
      console.error(`Argumento extra: ${a}`);
      process.exit(1);
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv);

  if (opts.help || (!opts.root && !opts.listLangs)) {
    printHelp();
    process.exit(opts.help ? 0 : 1);
  }

  if (opts.listLangs) {
    console.log("Lenguajes registrados:\n");
    for (const l of listAll()) {
      console.log(
        `  ${l.id.padEnd(12)} strategy=${l.strategy.padEnd(12)} ext=${l.extensions.join(",")}`
      );
      if (l.reason) console.log(`               ${l.reason}`);
    }
    process.exit(0);
  }

  try {
    const result = runStripConsole({
      root: path.resolve(opts.root),
      dry: opts.dry,
      quiet: opts.quiet,
      reportDir: opts.reportDir
        ? path.resolve(opts.reportDir)
        : undefined,
      extraIgnoreDirs: opts.extraIgnoreDirs,
    });
    process.exit(result.errors > 0 ? 2 : 0);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
