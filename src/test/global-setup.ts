// Vitest global setup: make sure the snapshot read model exists before the suite runs,
// so the decode route test has data to read. It builds from the local pinned framework
// data (no database needed) only when the snapshot is not already there.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export default function setup(): void {
  if (!existsSync("public/snapshot/manifest.json")) {
    execFileSync(
      "node",
      ["pipeline/build-snapshot.mjs", "--source=local", "--out=public/snapshot"],
      { stdio: "ignore" },
    );
  }
}
