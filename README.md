# @darkaegis/strip-console

CLI by **Dark Aegis** to **remove `console.*`** from any project.

1. Scans the tree  
2. **Detects language** by extension  
3. Strips only languages with real `console.*` syntax (JS / TS / JSX / TSX)  
4. Other languages (Python `print`, C# `Console.WriteLine`, etc.) → **skip**  
5. **Dry-run** + **TXT reports** (summary / detail / skipped)

## Install (global)

```bash
npm install -g @darkaegis/strip-console
```

Local / link while developing:

```bash
cd path/to/strip-console
npm install
npm link
```

## Usage

```bash
# Dry-run first (recommended)
strip-console path/to/project --dry

# Apply
strip-console path/to/project

# Custom report folder
strip-console path/to/project --dry --report-dir ./reports

# List languages
strip-console --list-langs
```

Alias: `da-strip-console` (same binary).

## Reports

Default: `<project>/.strip-console-reports/`

| File | Content |
|------|---------|
| `strip-console-*-summary-*.txt` | Totals by language |
| `strip-console-*-detail-*.txt` | Each `console.X` + preview |
| `strip-console-*-skipped-*.txt` | Skipped files + reason |

## Languages

| Extensions | Action |
|------------|--------|
| `.js` `.mjs` `.cjs` `.jsx` | Babel AST → surgical cut |
| `.ts` `.tsx` `.mts` `.cts` | Babel AST → surgical cut |
| `.vue` `.svelte` | Skip (SFC; future) |
| `.py` `.dart` `.cs` `.java` … | Skip (not `console.*`) |

Does **not** reformat files — only splices ranges in the original source.

## Programmatic API

```js
const { runStripConsole } = require("@darkaegis/strip-console");

runStripConsole({
  root: "/path/to/project",
  dry: true,
  reportDir: "/path/to/reports",
});
```

## Publish to npm

```bash
npm login          # account: darkaegis
npm run pack:check
npm run publish:npm
```

Bump version:

```bash
npm version patch
npm run publish:npm
```

## License

MIT © Dark Aegis
