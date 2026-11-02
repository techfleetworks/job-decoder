// Vitest global setup: build the snapshot read model before the suite runs, so the decode
// route test has current data to read. It always rebuilds from the local pinned framework
// data (no database needed), so a stale snapshot from an earlier build with a different
// shape cannot make a test read missing files.
import { execFileSync } from "node:child_process";

export default function setup(): void {
  execFileSync(
    "node",
    ["pipeline/build-snapshot.mjs", "--source=local", "--out=public/snapshot"],
    { stdio: "ignore" },
  );
}
