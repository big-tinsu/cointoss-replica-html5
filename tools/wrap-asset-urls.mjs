#!/usr/bin/env node
/**
 * Wraps every `public/` asset reference in `src/` with `assetUrl()`.
 *
 * `public/` is the one directory Vite copies verbatim — it never rewrites
 * those URLs, so a hard-coded "assets/ui/logo.png" 404s the moment the game
 * is mounted under a proxy sub-path. `src/assetUrl.ts` applies
 * `VITE_BASE_PATH` at runtime; this codemod is what keeps new references
 * from bypassing it.
 *
 * Wired to `prebuild` (and `predev`), so the tree cannot drift. It is
 * idempotent — an already-wrapped reference is left alone — and rewrites
 * files in place. `--check` reports instead of writing, for CI.
 *
 * Scope, deliberately narrow so prose is never mangled:
 *   - only string / template literals, never comments or regex literals
 *     (the tokenizer below skips both);
 *   - only literals whose text resolves to a file that actually exists
 *     under `public/`, or — for a template like `assets/ui/${name}.png` —
 *     to at least one such file with the interpolations as wildcards;
 *   - a leading "/" or "./", or a leading `${BASE_URL}`-style prefix, is
 *     stripped: `assetUrl` re-applies whatever prefix is configured.
 *
 * Stylesheets cannot call a function, so a `url()` pointing into `public/`
 * is reported as an error rather than rewritten — register those at runtime
 * instead (see `src/ui/fonts.ts`).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, sep, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
const SRC_DIR = join(ROOT, "src");
const HELPER = join(SRC_DIR, "assetUrl.ts");
const HELPER_NAME = "assetUrl";

/** Not player-facing (design reference shots), so not shipped and not worth
 * rewriting. Mirrors `gen-asset-manifest.mjs`'s own skip list, minus
 * `loading-screen` — the boot logo IS referenced, just not preloaded. */
const SKIP_TOP_LEVEL = new Set(["reference", "docs"]);
/** Generated, or the helper itself. */
const SKIP_SOURCES = new Set(["loading/assetManifest.ts", "assetUrl.ts"]);

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;
const STYLE_EXT = /\.(css|scss|sass|less)$/;

/* ------------------------------------------------------------------ public */

function walk(dir, base, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    const rel = relative(base, full).split(sep).join("/");
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(rel);
  }
  return out;
}

const assets = existsSync(PUBLIC_DIR)
  ? walk(PUBLIC_DIR, PUBLIC_DIR).filter((f) => !SKIP_TOP_LEVEL.has(f.split("/")[0]))
  : [];
const assetSet = new Set(assets);
/** "assets", "fonts", "loading-screen" — the anchor a candidate path must
 * open with, spelled out literally. Without it, `${a}/${b}/${c}` (a date
 * format, a URL built from parts) matches the wildcard rule by accident. */
const topLevel = new Set(assets.map((a) => a.split("/")[0]));

/* ------------------------------------------------------- literal matching */

/** "./assets/x.png", "/assets/x.png" and "${BASE}assets/x.png" all name the
 * same shipped file; `assetUrl` owns the prefix, so drop it here. */
function stripPrefix(text) {
  return text.replace(/^\$\{\s*[A-Za-z_$][\w$]*\s*\}/, "").replace(/^\.?\/+/, "");
}

/** A template's `${...}` holes stand for part of one path segment, so compare
 * against the real file list with those holes as wildcards. */
function matchesAsset(text) {
  if (!text.includes("/")) return false; // bare sprite names are not paths
  if (assetSet.has(text)) return true;
  if (!text.includes("${")) return false;
  if (/[*?]/.test(text)) return false; // a glob in prose, not a real path
  if (!topLevel.has(text.slice(0, text.indexOf("/")))) return false;
  const pattern = new RegExp(
    "^" +
      text
        .split(/\$\{[^}]*\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]*") +
      "$",
  );
  return assets.some((a) => pattern.test(a));
}

/* ---------------------------------------------------------------- scanning */

/**
 * Every string / template literal in a JS-family source, skipping comments
 * and regex literals so a filename mentioned in a doc comment is never
 * rewritten.
 */
function literals(src) {
  const found = [];
  // Tokens after which a `/` opens a regex rather than divides.
  const REGEX_OK = /[({[,;:=!&|?+\-*%~^]\s*$|\b(return|typeof|case|in|of|new|do|else)\s*$/;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      if (nl < 0) break;
      i = nl;
    } else if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
    } else if (c === "/" && REGEX_OK.test(src.slice(Math.max(0, i - 12), i))) {
      i += 1;
      while (i < src.length && src[i] !== "/" && src[i] !== "\n") {
        if (src[i] === "\\") i += 1;
        else if (src[i] === "[") while (i < src.length && src[i] !== "]" && src[i] !== "\n") i += 1;
        i += 1;
      }
      i += 1;
    } else if (c === '"' || c === "'" || c === "`") {
      const start = i;
      let depth = 0;
      i += 1;
      while (i < src.length) {
        const d = src[i];
        if (d === "\\") i += 2;
        else if (c === "`" && d === "$" && src[i + 1] === "{") ((depth += 1), (i += 2));
        else if (c === "`" && depth > 0 && d === "}") ((depth -= 1), (i += 1));
        else if (depth === 0 && d === c) break;
        else if (c !== "`" && d === "\n") break; // unterminated; bail out
        else i += 1;
      }
      found.push({ start, end: i + 1, quote: c, text: src.slice(start + 1, i) });
      i += 1;
    } else i += 1;
  }
  return found;
}

/** Is this literal already the argument of an `assetUrl(...)` call? */
function alreadyWrapped(src, start) {
  return /assetUrl\(\s*$/.test(src.slice(Math.max(0, start - 24), start));
}

function importSpecifier(fileAbs) {
  let rel = relative(dirname(fileAbs), HELPER).split(sep).join("/").replace(/\.ts$/, "");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

/** Inserts the import after the file's existing import block, or after its
 * leading doc comment for a module that has none. */
function ensureImport(src, fileAbs) {
  if (new RegExp(`import\\s*\\{[^}]*\\b${HELPER_NAME}\\b[^}]*\\}`).test(src)) return src;
  const statement = `import { ${HELPER_NAME} } from "${importSpecifier(fileAbs)}";\n`;
  const imports = [...src.matchAll(/^import\s[^;]*;[ \t]*$/gm)];
  if (imports.length) {
    const last = imports[imports.length - 1];
    const at = last.index + last[0].length;
    return src.slice(0, at) + "\n" + statement.trimEnd() + src.slice(at);
  }
  const doc = src.match(/^\s*\/\*[\s\S]*?\*\/\n/);
  const at = doc ? doc[0].length : 0;
  return src.slice(0, at) + (doc ? "\n" : "") + statement + (doc ? "" : "\n") + src.slice(at);
}

/* ------------------------------------------------------------------- main */

const check = process.argv.includes("--check");
const sources = existsSync(SRC_DIR) ? walk(SRC_DIR, SRC_DIR) : [];
const changed = [];
const styleErrors = [];

for (const rel of sources) {
  const abs = join(SRC_DIR, rel);
  if (SKIP_SOURCES.has(rel)) continue;

  if (STYLE_EXT.test(rel)) {
    for (const m of readFileSync(abs, "utf8").matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (matchesAsset(stripPrefix(m[1].trim()))) {
        styleErrors.push(`${posix.join("src", rel)}: url(${m[1]})`);
      }
    }
    continue;
  }
  if (!CODE_EXT.test(rel)) continue;

  const original = readFileSync(abs, "utf8");
  const edits = [];
  for (const lit of literals(original)) {
    if (alreadyWrapped(original, lit.start)) continue;
    const target = stripPrefix(lit.text);
    if (!matchesAsset(target)) continue;
    edits.push({ ...lit, target });
  }
  if (!edits.length) continue;

  let out = original;
  for (const edit of edits.reverse()) {
    // Backticks are kept only where they earn it — an interpolation. Anything
    // else is re-emitted double-quoted, matching this project's style.
    const literal = edit.target.includes("${")
      ? `\`${edit.target}\``
      : JSON.stringify(edit.target);
    out = out.slice(0, edit.start) + `${HELPER_NAME}(${literal})` + out.slice(edit.end);
  }
  out = ensureImport(out, abs);
  changed.push({ file: posix.join("src", rel), count: edits.length });
  if (!check) writeFileSync(abs, out);
}

for (const err of styleErrors) {
  console.error(
    `asset urls: ${err} — a stylesheet cannot call ${HELPER_NAME}(); register it at runtime instead (see src/ui/fonts.ts).`,
  );
}

if (changed.length) {
  for (const c of changed) {
    console.log(
      `asset urls: ${check ? "unwrapped" : "wrapped"} ${c.count} reference(s) in ${c.file}`,
    );
  }
  if (check) console.error("asset urls: run `npm run assets:wrap` to fix.");
} else {
  console.log(`asset urls: ${assets.length} public files, all references wrapped.`);
}

if (styleErrors.length || (check && changed.length)) process.exit(1);
