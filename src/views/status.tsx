import type { Status } from '../status.js';

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <table>
          <tbody>
            {status.nights.map((n) => (
              <tr>
                <td><a href={`/digest/${n.night}`}>{n.night}</a></td>
                <td>ok {n.counts ? n.counts.ok : '—'}</td>
                <td>retry {n.counts ? n.counts.retry : '—'}</td>
                <td>fail {n.counts ? n.counts.fail : '—'}</td>
                {n.counts && n.counts.bad > 0 ? <td class="warn">bad {n.counts.bad}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
