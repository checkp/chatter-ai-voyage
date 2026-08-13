// Line-level diff for build-mode artifacts. Relay agents each return a full
// document, so a diff is the only honest way to see what an agent actually did.

export interface DiffRow {
  kind: 'add' | 'del' | 'ctx';
  text: string;
  /** 1-based line number in the new document (for adds/context). */
  line?: number;
  /** 1-based line number in the old document (for deletions/context). */
  oldLine?: number;
}

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
  identical: boolean;
}

/** Classic LCS table diff — artifacts are a few hundred lines, so this is fine. */
export const diffLines = (before: string, after: string): DiffResult => {
  const a = before.split('\n');
  const b = after.split('\n');

  if (before === after) {
    return { rows: [], added: 0, removed: 0, identical: true };
  }

  const n = a.length;
  const m = b.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ kind: 'ctx', text: a[i], line: j + 1, oldLine: i + 1 });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ kind: 'del', text: a[i], oldLine: i + 1 });
      removed += 1;
      i += 1;
    } else {
      rows.push({ kind: 'add', text: b[j], line: j + 1 });
      added += 1;
      j += 1;
    }
  }
  while (i < n) { rows.push({ kind: 'del', text: a[i], oldLine: i + 1 }); removed += 1; i += 1; }
  while (j < m) { rows.push({ kind: 'add', text: b[j], line: j + 1 }); added += 1; j += 1; }

  return { rows, added, removed, identical: added === 0 && removed === 0 };
};

/** Collapse long runs of unchanged lines, keeping `pad` lines of context. */
export const collapseContext = (rows: DiffRow[], pad = 2): Array<DiffRow | { kind: 'gap'; count: number }> => {
  const keep = new Array(rows.length).fill(false);
  rows.forEach((row, index) => {
    if (row.kind === 'ctx') return;
    for (let k = Math.max(0, index - pad); k <= Math.min(rows.length - 1, index + pad); k += 1) keep[k] = true;
  });

  const out: Array<DiffRow | { kind: 'gap'; count: number }> = [];
  let skipped = 0;
  rows.forEach((row, index) => {
    if (keep[index]) {
      if (skipped > 0) { out.push({ kind: 'gap', count: skipped }); skipped = 0; }
      out.push(row);
    } else {
      skipped += 1;
    }
  });
  if (skipped > 0) out.push({ kind: 'gap', count: skipped });
  return out;
};

export type CollapsedRow = DiffRow | { kind: 'gap'; count: number };

export interface SplitCell {
  line?: number;
  text: string;
  /** Inline segments so changed words stand out inside a modified line. */
  segments: Array<{ text: string; changed: boolean }>;
}

export interface SplitRow {
  /** 'mod' pairs a deletion with the addition that replaced it. */
  kind: 'add' | 'del' | 'ctx' | 'mod' | 'gap';
  left?: SplitCell;
  right?: SplitCell;
  count?: number;
}

/** Character-level highlight of the differing middle of two similar lines. */
const inlineSegments = (before: string, after: string): [SplitCell['segments'], SplitCell['segments']] => {
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before[start] === after[start]) start += 1;
  let end = 0;
  while (end < max - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end += 1;

  const seg = (text: string): SplitCell['segments'] => {
    const head = text.slice(0, start);
    const mid = text.slice(start, text.length - end);
    const tail = end ? text.slice(text.length - end) : '';
    return [
      { text: head, changed: false },
      { text: mid, changed: true },
      { text: tail, changed: false },
    ].filter(s => s.text.length > 0);
  };
  return [seg(before), seg(after)];
};

const plain = (text: string): SplitCell['segments'] => [{ text, changed: false }];

/** Similar enough that pairing them as one modified line reads better than +/−. */
const similar = (a: string, b: string): boolean => {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return false;
  const shared = Math.min(x.length, y.length);
  let common = 0;
  while (common < shared && x[common] === y[common]) common += 1;
  return common >= Math.max(3, Math.floor(Math.max(x.length, y.length) * 0.25));
};

/** Turn a collapsed unified diff into aligned left/right rows. */
export const toSplitRows = (rows: CollapsedRow[]): SplitRow[] => {
  const out: SplitRow[] = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];

    if (row.kind === 'gap') {
      out.push({ kind: 'gap', count: row.count });
      index += 1;
      continue;
    }

    if (row.kind === 'ctx') {
      out.push({
        kind: 'ctx',
        left: { line: row.oldLine, text: row.text, segments: plain(row.text) },
        right: { line: row.line, text: row.text, segments: plain(row.text) },
      });
      index += 1;
      continue;
    }

    // Gather the run of deletions then additions and align them pairwise.
    const dels: DiffRow[] = [];
    const adds: DiffRow[] = [];
    while (index < rows.length && rows[index].kind === 'del') { dels.push(rows[index] as DiffRow); index += 1; }
    while (index < rows.length && rows[index].kind === 'add') { adds.push(rows[index] as DiffRow); index += 1; }

    const pairs = Math.max(dels.length, adds.length);
    for (let k = 0; k < pairs; k += 1) {
      const del = dels[k];
      const add = adds[k];
      if (del && add) {
        const [l, r] = similar(del.text, add.text)
          ? inlineSegments(del.text, add.text)
          : [plain(del.text), plain(add.text)];
        out.push({
          kind: 'mod',
          left: { line: del.oldLine, text: del.text, segments: l },
          right: { line: add.line, text: add.text, segments: r },
        });
      } else if (del) {
        out.push({ kind: 'del', left: { line: del.oldLine, text: del.text, segments: plain(del.text) } });
      } else if (add) {
        out.push({ kind: 'add', right: { line: add.line, text: add.text, segments: plain(add.text) } });
      }
    }
  }

  return out;
};
