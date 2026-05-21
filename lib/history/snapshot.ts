// ============================================================
// history/snapshot.ts
// Persiste TacticalSignal em data/snapshots/YYYY-MM-DD.jsonl
// Um arquivo por dia, uma entrada por execução.
// ============================================================

import * as fs   from "fs";
import * as path from "path";
import { TacticalSignal } from "../shared/types/signal";

const SNAPSHOTS_DIR = path.resolve(process.cwd(), "data/snapshots");

export function saveSnapshot(signal: TacticalSignal): void {
  const date = signal.generatedAt.slice(0, 10);
  const file = path.join(SNAPSHOTS_DIR, `${date}.jsonl`);

  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }

  fs.appendFileSync(file, JSON.stringify(signal) + "\n", "utf8");
}

export function loadSnapshots(date: string): TacticalSignal[] {
  const file = path.join(SNAPSHOTS_DIR, `${date}.jsonl`);
  if (!fs.existsSync(file)) return [];

  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TacticalSignal);
}
