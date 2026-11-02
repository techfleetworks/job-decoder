#!/usr/bin/env node
/**
 * The mechanical half of the architecture gate (ADR-0003, extended for the three
 * tiers in ADR-0006 and ADR-0009). It enforces the boundaries in decisions.md so a
 * regression is caught by CI, not only by human review. Rules:
 *
 *   1. domain-purity       - src/domain/** uses no fetch, storage, window, document,
 *                            process.env, Request/Response, React, or next/*.
 *   2. session-only        - no localStorage or IndexedDB anywhere in app/ or src/;
 *                            sessionStorage only in the session store owner (ADR-0011).
 *   3. browser-no-db-client- client code never imports the Supabase client (ADR-0006).
 *   4. browser-no-secret   - client code never reads a server-only env var; only
 *                            NEXT_PUBLIC_* is allowed in the browser (ADR-0009).
 *   5. no-literal-color    - components read color from the theme, never a literal
 *                            (ADR-0013).
 *
 * Each violation names the file, the line, and the rule broken (T10 acceptance 8), so
 * a failure points straight at the offending line. Comments and strings are blanked
 * before matching, with their newlines preserved, so line numbers stay accurate and a
 * term named only in prose is not flagged.
 *
 * "Tier-1 holds no business rules" stays a review rule (judge-arch); it is not
 * reliably checkable by a text scan.
 *
 * Known limitations (judge-arch review, 2026-11-01):
 *   - no-literal-color catches hex and rgb/rgba/hsl/hsla, not CSS named colors
 *     (e.g. "rebeccapurple"). A named-color allowlist is a tracked follow-up; a
 *     naive check would wrongly flag MUI theme tokens like color="primary".
 *   - the hex check could match a hex-like anchor href (#abc), not just a color.
 *   - secret and DB-client detection is import- and process.env-shaped, so a
 *     dynamic import or a lowercased env name would slip. Layered, not absolute
 *     (ADR-0009); the client bundle cannot reach a server-only env at runtime.
 *
 * Usage: `node scripts/check-architecture.mjs [root]` (defaults to the repo root).
 * Scans <root>/app and <root>/src. Exits non-zero on any violation.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const SESSION_OWNER = "src/data/session/sessionStore.ts";

const RE = {
  fetch: /\bfetch\b/,
  localStorage: /\blocalStorage\b/,
  indexedDB: /\bindexedDB\b/,
  sessionStorage: /\bsessionStorage\b/,
  window: /\bwindow\b/,
  document: /\bdocument\b/,
  reactImport: /\bfrom\s+['"]react(-dom)?(\/[^'"]*)?['"]/,
  nextImport: /\bfrom\s+['"]next(\/[^'"]*)?['"]/,
  supabaseImport: /\bfrom\s+['"]@supabase\/[^'"]*['"]/,
  secretEnv: /process\.env\.(?!NEXT_PUBLIC_)[A-Z][A-Z0-9_]*/,
  requestResponse: /\b(?:NextRequest|NextResponse)\b/,
  hexColor: /#[0-9a-fA-F]{3,8}\b/,
  cssColorFn: /\b(?:rgb|rgba|hsl|hsla)\s*\(/,
};

/** Blank out everything matched except newlines, so positions and line counts hold. */
function blankKeepingNewlines(text) {
  return text.replace(/[^\n]/g, " ");
}

/** Remove comments but keep strings (needed to see import paths and color literals). */
function stripComments(src) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, blankKeepingNewlines);
  s = s.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p1) => p1 + blankKeepingNewlines(m.slice(p1.length)));
  return s;
}
/** Also blank string contents, so a bare identifier in a string is not matched. */
function stripStrings(src) {
  let s = src.replace(/`(?:\\.|[^`\\])*`/g, blankKeepingNewlines);
  s = s.replace(/'(?:\\.|[^'\\])*'/g, blankKeepingNewlines);
  s = s.replace(/"(?:\\.|[^"\\])*"/g, blankKeepingNewlines);
  return s;
}

/** 1-based line number of the first match of re in haystack, or 1 if none. */
function lineOf(haystack, re) {
  const m = re.exec(haystack);
  if (!m) return 1;
  let line = 1;
  for (let i = 0; i < m.index; i++) if (haystack[i] === "\n") line++;
  return line;
}

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
]);
function listSourceFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Scan a project root and return every architecture violation found. */
export function scanDir(root) {
  const violations = [];
  const files = [
    ...listSourceFiles(join(root, "app")),
    ...listSourceFiles(join(root, "src")),
  ];
  for (const file of files) {
    const rel = relative(root, file).split(sep).join("/");
    if (/\.test\.(ts|tsx)$/.test(rel)) continue;

    const raw = readFileSync(file, "utf8");
    const noComments = stripComments(raw);
    const code = stripStrings(noComments);

    const isDomain = rel.startsWith("src/domain/");
    const isTheme = rel.startsWith("src/theme/");
    const isServer =
      rel.startsWith("app/api/") ||
      rel.startsWith("src/server/") ||
      rel.includes("/server/");
    const isSessionOwner = rel === SESSION_OWNER;
    const isComponent =
      (rel.startsWith("app/") && rel.endsWith(".tsx")) ||
      rel.startsWith("src/components/");
    const isClient = !isServer && !isDomain;

    // flag(rule, text, re, haystack): records the file, the 1-based line of the match,
    // the rule, and the detail, so the output points straight at the offending line.
    const flag = (rule, text, re, haystack) =>
      violations.push({ file: rel, line: lineOf(haystack, re), rule, detail: text });

    if (isDomain) {
      if (RE.fetch.test(code)) flag("domain-purity", 'domain references "fetch"', RE.fetch, code);
      if (RE.localStorage.test(code)) flag("domain-purity", 'domain references "localStorage"', RE.localStorage, code);
      if (RE.sessionStorage.test(code)) flag("domain-purity", 'domain references "sessionStorage"', RE.sessionStorage, code);
      if (RE.indexedDB.test(code)) flag("domain-purity", 'domain references "indexedDB"', RE.indexedDB, code);
      if (RE.window.test(code)) flag("domain-purity", 'domain references "window"', RE.window, code);
      if (RE.document.test(code)) flag("domain-purity", 'domain references "document"', RE.document, code);
      if (RE.reactImport.test(noComments)) flag("domain-purity", "domain imports React", RE.reactImport, noComments);
      if (RE.nextImport.test(noComments)) flag("domain-purity", "domain imports next/*", RE.nextImport, noComments);
      if (RE.requestResponse.test(code)) flag("domain-purity", "domain references NextRequest/NextResponse", RE.requestResponse, code);
      if (RE.secretEnv.test(code)) flag("domain-purity", "domain reads process.env", RE.secretEnv, code);
      continue;
    }

    // session-only state (applies to every non-domain file too).
    if (RE.localStorage.test(code)) {
      flag("session-only", "localStorage is forbidden; state is session-only (ADR-0011)", RE.localStorage, code);
    }
    if (RE.indexedDB.test(code)) {
      flag("session-only", "IndexedDB is forbidden; state is session-only (ADR-0011)", RE.indexedDB, code);
    }
    if (RE.sessionStorage.test(code) && !isSessionOwner) {
      flag("session-only", `sessionStorage is only allowed in ${SESSION_OWNER}`, RE.sessionStorage, code);
    }

    if (isClient) {
      if (RE.supabaseImport.test(noComments)) {
        flag("browser-no-db-client", "client code imports the Supabase client (only tier 2 may)", RE.supabaseImport, noComments);
      }
      if (RE.secretEnv.test(code)) {
        flag("browser-no-secret", "client code reads a server-only env var (only NEXT_PUBLIC_* is allowed)", RE.secretEnv, code);
      }
    }

    if (isComponent && !isTheme) {
      if (RE.hexColor.test(noComments)) {
        flag("no-literal-color", "a hex color literal in a component (read it from the theme)", RE.hexColor, noComments);
      }
      if (RE.cssColorFn.test(noComments)) {
        flag("no-literal-color", "a CSS color function in a component (read it from the theme)", RE.cssColorFn, noComments);
      }
    }
  }
  return violations;
}

function main() {
  const root = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  const violations = scanDir(root);
  if (violations.length > 0) {
    console.error(`Architecture gate: ${violations.length} violation(s)`);
    for (const v of violations) {
      console.error(`  [${v.rule}] ${v.file}:${v.line}: ${v.detail}`);
    }
    process.exit(1);
  }
  console.log(
    "Architecture gate: PASS (tier boundaries, domain purity, session-only, theme colors)",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
