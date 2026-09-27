export type DiffType = "equal" | "add" | "remove";

export interface DiffRow {
  type: DiffType;
  leftNumber: number | null;
  rightNumber: number | null;
  left: string | null;
  right: string | null;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
}

const MAX_MATRIX_CELLS = 4_000_000;

/** Line-level diff computed with a longest-common-subsequence table. */
export function diffLines(before: string, after: string): DiffRow[] {
  const a = before.split("\n");
  const b = after.split("\n");

  if (a.length * b.length > MAX_MATRIX_CELLS) {
    return a.map((line, index) => ({
      type: line === b[index] ? "equal" : "remove",
      leftNumber: index + 1,
      rightNumber: b[index] === undefined ? null : index + 1,
      left: line,
      right: b[index] ?? null,
    }));
  }

  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ type: "equal", leftNumber: i + 1, rightNumber: j + 1, left: a[i], right: b[j] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ type: "remove", leftNumber: i + 1, rightNumber: null, left: a[i], right: null });
      i += 1;
    } else {
      rows.push({ type: "add", leftNumber: null, rightNumber: j + 1, left: null, right: b[j] });
      j += 1;
    }
  }

  while (i < a.length) {
    rows.push({ type: "remove", leftNumber: i + 1, rightNumber: null, left: a[i], right: null });
    i += 1;
  }
  while (j < b.length) {
    rows.push({ type: "add", leftNumber: null, rightNumber: j + 1, left: null, right: b[j] });
    j += 1;
  }

  return rows;
}

export function summariseDiff(rows: DiffRow[]): DiffSummary {
  return rows.reduce<DiffSummary>(
    (summary, row) => {
      if (row.type === "add") summary.added += 1;
      else if (row.type === "remove") summary.removed += 1;
      else summary.unchanged += 1;
      return summary;
    },
    { added: 0, removed: 0, unchanged: 0 },
  );
}
