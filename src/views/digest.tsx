import { isWarn } from '../digest/warn.js';
import type { Night } from '../digest/types.js';

const dash = '—';

export function DigestPage({ data }: { data: Night }) {
  const { rows, badLines } = data;
  return (
    <>
      <h1>digest {data.night}</h1>
      {badLines > 0 && (
        <p class="warn">{badLines === 1 ? '1 line could not be read' : `${badLines} lines could not be read`}</p>
      )}
      {rows.length === 0 ? (
        badLines === 0 && <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr class={isWarn(r) ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export function DigestNotFound({ night }: { night: string }) {
  return (
    <>
      <h1>digest</h1>
      <p class="warn">no digest for {night}</p>
    </>
  );
}
