import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

const LINES = [
  '{"at":"2026-10-28T02:00:00+01:00","job":"notes/backup","owner":"ana","status":"ok"}',
  '{"at":"2026-10-28T02:05:00+01:00","job":"lane/sync","owner":"bo","status":"retry","error":"timeout"}',
  '{"at":"2026-10-28T02:06:00+01:00","job":"lane/sync","owner":"bo","status":"retry","error":"timeout"}',
  '{"at":"2026-10-28T02:07:00+01:00","job":"lane/sync","owner":"bo","status":"retry","error":"timeout"}',
  '{"at":"2026-10-28T02:08:00+01:00","job":"lane/sync","owner":"bo","status":"ok"}',
  '{"at":"2026-10-28T03:00:00+01:00","job":"digest/render","owner":null,"status":"fail","error":"disk full"}',
];

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  writeFileSync(join(dir, '2026-10-28.jsonl'), LINES.join('\n') + '\n');
  writeFileSync(join(dir, '2026-10-29.jsonl'), '');
  writeFileSync(join(dir, '2026-10-30.jsonl'), [LINES[0], 'not json', LINES[5], ''].join('\n'));
  app = createApp({ ...base, runsDir: dir });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// Job names in the order the page lists them, plus the warn-marked ones.
function pageRows(html: string): { jobs: string[]; warn: string[] } {
  const rows = [...html.matchAll(/<tr( class="warn")?><td>([^<]*)<\/td>/g)];
  return {
    jobs: rows.map((m) => m[2]),
    warn: rows.filter((m) => m[1]).map((m) => m[2]),
  };
}

describe('GET /digest/:night on a normal night', () => {
  it('returns 200, lists jobs sorted, marks retries of 3+ and fails', async () => {
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    const { jobs, warn } = pageRows(await res.text());
    expect(jobs).toEqual(['digest/render', 'lane/sync', 'notes/backup']);
    expect(warn).toEqual(['digest/render', 'lane/sync']);
  });
});

describe('GET /api/digest/:night on a normal night', () => {
  it('returns 200 with the rows and their counts', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.night).toBe('2026-10-28');
    expect(body.badLines).toBe(0);
    expect(body.rows).toHaveLength(3);
    expect(body.rows[1]).toMatchObject({
      job: 'lane/sync',
      owner: 'bo',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'timeout',
      firstAt: '2026-10-28T02:05:00+01:00',
      lastAt: '2026-10-28T02:08:00+01:00',
    });
    expect(body.rows[0]).toMatchObject({ job: 'digest/render', owner: null, lastStatus: 'fail' });
  });
});

describe('404 for a night with no file', () => {
  it('page returns 404', async () => {
    const res = await app.request('/digest/2026-11-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no digest for 2026-11-01');
  });

  it('JSON returns 404', async () => {
    const res = await app.request('/api/digest/2026-11-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night', night: '2026-11-01' });
  });
});

describe('empty night', () => {
  it('page says nothing ran', async () => {
    const res = await app.request('/digest/2026-10-29');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('JSON has no rows and no bad lines', async () => {
    const res = await app.request('/api/digest/2026-10-29');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-10-29', rows: [], badLines: 0 });
  });
});

describe('night with a bad line', () => {
  it('page shows the bad line count and still renders the good rows', async () => {
    const res = await app.request('/digest/2026-10-30');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('1 line could not be read');
    expect(html).not.toContain('nothing ran');
    expect(pageRows(html).jobs).toEqual(['digest/render', 'notes/backup']);
  });

  it('JSON badLines matches and good rows are kept', async () => {
    const res = await app.request('/api/digest/2026-10-30');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['digest/render', 'notes/backup']);
  });
});

describe('page and JSON agree', () => {
  it.each(['2026-10-28', '2026-10-30'])('list the same jobs in the same order for %s', async (night) => {
    const page = pageRows(await (await app.request(`/digest/${night}`)).text());
    const body = await (await app.request(`/api/digest/${night}`)).json();
    expect(page.jobs).toEqual(body.rows.map((r: { job: string }) => r.job));
  });
});
