// Plan morning-digest, section 1. The contract every part of section 2 codes against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in runs/<night>.jsonl. Times are the log's own strings, offset kept.
export type DigestRow = {
  job: string;
  owner: string | null; // owner of the job's last line; views render null as `—`
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // most recent `error` seen for this job, null if none
  firstAt: string;
  lastAt: string;
};

// rows sorted by job. rows: [] with badLines: 0 is an empty file ("nothing ran").
export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number; // lines that did not parse or failed validation
};

// null: no such file, or `night` is not YYYY-MM-DD (route answers 404). Never throws on content.
export type ReadNight = (runsDir: string, night: string) => Night | null;
