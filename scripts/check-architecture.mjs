#!/usr/bin/env node
/**
 * The mechanical half of the architecture gate (ADR-0003). Enforces the
 * boundary rules written in decisions.md so a future regression is caught by CI,
 * not only by human review:
 *   1. Domain purity    — nothing under `domain/` may use fetch / localStorage /
 *      sessionStorage / window / document, or import React.
 *   2. localStorage owner — `localStorage` appears only in the storage service.
 *   3. fetch owner        — `fetch` appears only in the framework loader.
 *   4. Services avoid React.
 *
 * Usage: `node scripts/check-architecture.mjs [srcRoot]` (defaults to ./src).
 * Exits non-zero when any rule is violated. Comments and string literals are
 * stripped before matching, so prose that merely mentions a term is not flagged.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const LS_OWNER = "services/storage/localStore.ts";
const FETCH_OWNER = "services/framework/loader.ts";

const RE = {
  fetch: /\bfetch\b/,
  localStorage: /\blocalStorage\b/,
  sessionStorage: /\bsessionStorage\b/,
  window: /\bwindow\b/,
  document: /\bdocument\b/,
  react: /from\s+['"]react(-dom)?(\/[^'"]*)?['"]/,
};

const DOMAIN_FORBIDDEN = [
  ["fetch", RE.fetch],
  ["localStorage", RE.localStorage],
  ["sessionStorage", RE.sessionStorage],
  ["window", RE.window],
  ["document", RE.document],
  ["react import", RE.react],
];

/** Remove comments and string literals so only real code tokens are matched. */
function stripCommentsAndStrings(src) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, " ");
  s = s.replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");
  s = s.replace(/`(?:\\.|[^`\\])*`/g, '""');
  s = s.replace(/'(?:\\.|[^'\\])*'/g, '""');
  s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
  return s;
}

function listSourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Scan a source root and return every architecture violation found. */
export function scanDir(root) {
  const violations = [];
  for (const file of listSourceFiles(root)) {
    const rel = relative(root, file).split(sep).join("/");
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;

    const code = stripCommentsAndStrings(readFileSync(file, "utf8"));
    const topDir = rel.split("/")[0];

    if (topDir === "domain") {
      for (const [name, re] of DOMAIN_FORBIDDEN) {
        if (re.test(code)) {
          violations.push({
            file: rel,
            rule: "domain-purity",
            detail: `domain code references "${name}" (domain must stay pure)`,
          });
        }
      }
      continue;
    }

    if (rel !== LS_OWNER && RE.localStorage.test(code)) {
      violations.push({
        file: rel,
        rule: "localStorage-owner",
        detail: `localStorage used outside ${LS_OWNER}`,
      });
    }
    if (rel !== FETCH_OWNER && RE.fetch.test(code)) {
      violations.push({
        file: rel,
        rule: "fetch-owner",
        detail: `fetch used outside ${FETCH_OWNER}`,
      });
    }
    if (topDir === "services" && RE.react.test(code)) {
      violations.push({
        file: rel,
        rule: "services-no-react",
        detail: "a service imports React (services own I/O, not UI)",
      });
    }
  }
  return violations;
}

function main() {
  const root = process.argv[2]
    ? resolve(process.argv[2])
    : join(process.cwd(), "src");
  const violations = scanDir(root);
  if (violations.length > 0) {
    console.error(`Architecture gate: ${violations.length} violation(s)`);
    for (const v of violations) {
      console.error(`  [${v.rule}] ${v.file}: ${v.detail}`);
    }
    process.exit(1);
  }
  console.log("Architecture gate: PASS (domain purity + I/O ownership)");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
