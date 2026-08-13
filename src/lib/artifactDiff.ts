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
