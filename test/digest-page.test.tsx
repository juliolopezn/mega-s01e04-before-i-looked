import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const base = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };

describe('digest page', () => {
  it('renders 2026-10-28 with the lane banner', async () => {
    const res = await createApp({ ...base, runsDir: 'runs' }).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane-07');
    expect(html).toContain('<th>last error</th>');
    expect(html).toContain('+01:00');
    expect(html).not.toContain('<td></td>');
  });

  it('404s, empty and bad-line nights', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    writeFileSync(join(dir, '2026-01-02.jsonl'), 'junk\n');
    const app = createApp({ ...base, runsDir: dir });
    const missing = await app.request('/digest/2026-01-03');
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('lane-07');
    expect(await (await app.request('/digest/2026-01-01')).text()).toContain('nothing ran');
    const bad = await (await app.request('/digest/2026-01-02')).text();
    expect(bad).toContain('1 line could not be read');
    expect(bad).not.toContain('nothing ran');
  });
});
