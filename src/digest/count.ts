import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRun } from './read.js';

export type NightCounts = { ok: number; retry: number; fail: number; bad: number };

// Line-level counts by status for runs/<night>.jsonl. null if the file cannot be read.
export function countNight(runsDir: string, night: string): NightCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0, bad: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const run = parseRun(line);
    if (run) counts[run.status]++;
    else counts.bad++;
  }
  return counts;
}
