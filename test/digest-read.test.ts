import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

function tempRuns(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('has 5 jobs sorted by job and 1 bad line', () => {
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('aggregates runs, retries, status, error and times per job', () => {
    const rows = Object.fromEntries((night?.rows ?? []).map((r) => [r.job, r]));
    expect(rows['fixtures/refresh']).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(rows['lane/sync']).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok', lastError: 'lock held', firstAt: '2026-10-28T23:00:06+01:00', lastAt: '2026-10-29T05:00:04+01:00' });
    expect(rows['notes/backup']).toMatchObject({ owner: 'lane-07', runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(rows['digest/render']).toMatchObject({ owner: null, lastError: null });
  });
});

describe('readNight edge cases', () => {
  it('returns null for a night with no file', () => {
    expect(readNight(tempRuns({}), '2026-10-30')).toBeNull();
  });

  it('returns no rows and no bad lines for an empty file', () => {
    expect(readNight(tempRuns({ '2026-10-30.jsonl': '' }), '2026-10-30')).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });

  it('counts invalid lines without throwing', () => {
    const body = [
      '{"at":"2026-10-30T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
      'not json',
      '[]',
      '{"at":"2026-10-30T01:00:00+01:00","job":"a","status":"maybe","owner":"rook"}',
      '{"at":"2026-10-30T01:00:00+01:00","status":"ok","owner":"rook"}',
      '{"at":"2026-10-30T01:00:00+01:00","job":"a","status":"ok"}',
      '{"at":"2026-10-30T01:00:00+01:00","job":"a","status":"ok","owner":"rook","error":5}',
      '',
    ].join('\n');
    const night = readNight(tempRuns({ '2026-10-30.jsonl': body }), '2026-10-30');
    expect(night?.badLines).toBe(6);
    expect(night?.rows).toHaveLength(1);
  });

  it('rejects a night that is not YYYY-MM-DD', () => {
    const dir = tempRuns({ 'x.jsonl': '{"at":"t","job":"a","status":"ok","owner":null}' });
    expect(readNight(dir, 'x')).toBeNull();
    expect(readNight(dir, '../runs/2026-10-28')).toBeNull();
    expect(readNight(dir, '2026-10-28.jsonl')).toBeNull();
  });
});
