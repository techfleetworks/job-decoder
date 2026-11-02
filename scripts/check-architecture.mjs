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

/** Remove comments but keep strings (needed to see import paths and color literals). */
function stripComments(src) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, " ");
  s = s.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1 ");
  return s;
}
/** Also blank string contents, so a bare identifier in a string is not matched. */
function stripStrings(src) {
  let s = src.replace(/`(?:\\.|[^`\\])*`/g, "``");
  s = s.replace(/'(?:\\.|[^'\\])*'/g, "''");
  s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
  return s;
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

    const add = (rule, detail) => violations.push({ file: rel, rule, detail });

    if (isDomain) {
      if (RE.fetch.test(code)) add("domain-purity", 'domain references "fetch"');
      if (RE.localStorage.test(code)) add("domain-purity", 'domain references "localStorage"');
      if (RE.sessionStorage.test(code)) add("domain-purity", 'domain references "sessionStorage"');
      if (RE.indexedDB.test(code)) add("domain-purity", 'domain references "indexedDB"');
      if (RE.window.test(code)) add("domain-purity", 'domain references "window"');
      if (RE.document.test(code)) add("domain-purity", 'domain references "document"');
      if (RE.reactImport.test(noComments)) add("domain-purity", "domain imports React");
      if (RE.nextImport.test(noComments)) add("domain-purity", "domain imports next/*");
      if (RE.requestResponse.test(code)) add("domain-purity", "domain references NextRequest/NextResponse");
      if (RE.secretEnv.test(code)) add("domain-purity", "domain reads process.env");
      continue;
    }

    // session-only state (applies to every non-domain file too).
    if (RE.localStorage.test(code)) {
      add("session-only", "localStorage is forbidden; state is session-only (ADR-0011)");
    }
    if (RE.indexedDB.test(code)) {
      add("session-only", "IndexedDB is forbidden; state is session-only (ADR-0011)");
    }
    if (RE.sessionStorage.test(code) && !isSessionOwner) {
      add("session-only", `sessionStorage is only allowed in ${SESSION_OWNER}`);
    }

    if (isClient) {
      if (RE.supabaseImport.test(noComments)) {
        add("browser-no-db-client", "client code imports the Supabase client (only tier 2 may)");
      }
      if (RE.secretEnv.test(code)) {
        add("browser-no-secret", "client code reads a server-only env var (only NEXT_PUBLIC_* is allowed)");
      }
    }

    if (isComponent && !isTheme) {
      if (RE.hexColor.test(noComments)) {
        add("no-literal-color", "a hex color literal in a component (read it from the theme)");
      }
      if (RE.cssColorFn.test(noComments)) {
        add("no-literal-color", "a CSS color function in a component (read it from the theme)");
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
      console.error(`  [${v.rule}] ${v.file}: ${v.detail}`);
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
