import type { Check, PullRequest } from "./pr";

export interface DiffLine {
  kind: "same" | "add" | "del";
  text: string;
}

/** 届いたプルリクエストの 1 行。`marked` は異変のある行 */
export interface MarkedLine {
  text: string;
  marked: boolean;
}

/** 届いたプルリクエストの 1 つの項目のうち、異変のあるところ */
export interface FieldMarks {
  /** 項目の名前（画面に表示する） */
  label: string;
  /** 異変のある行と、その前後の行。`null` は省略した部分 */
  lines: (MarkedLine | null)[];
}

/** 行単位の差分（最長共通部分列） */
export function diffLines(before: readonly string[], after: readonly string[]): DiffLine[] {
  const n = before.length;
  const m = after.length;
  // lcs[i][j] = before[i..] と after[j..] の最長共通部分列の長さ
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        before[i] === after[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      result.push({ kind: "same", text: before[i]! });
      i++;
      j++;
    } else if (i < n && (j === m || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      // 置き換えは、消えた行を先に並べる
      result.push({ kind: "del", text: before[i++]! });
    } else {
      result.push({ kind: "add", text: after[j++]! });
    }
  }
  return result;
}

/** 印のある行の前後 `context` 行だけを残し、それ以外を `null`（省略）にまとめる */
export function trimContext(lines: readonly MarkedLine[], context: number): (MarkedLine | null)[] {
  const keep = lines.map((_, i) => lines.slice(Math.max(0, i - context), i + context + 1).some((l) => l.marked));
  const result: (MarkedLine | null)[] = [];
  lines.forEach((line, i) => {
    if (keep[i]) result.push(line);
    else if (result.at(-1) !== null) result.push(null);
  });
  return result;
}

const checkStatus: Record<Check["status"], string> = { success: "成功", failure: "失敗", skipped: "スキップ" };

/** 画面に表示される順に、項目の名前と、その内容を行に分けたもの */
function fields(pr: PullRequest): [label: string, lines: string[]][] {
  return [
    ["ご案内", pr.notice],
    ["タイトル", [pr.title]],
    ["作成者", [pr.author]],
    ["マージ先", [pr.baseBranch]],
    ["ブランチ", [pr.headBranch]],
    ["コミット数", [String(pr.commits)]],
    ["作成日時", [pr.openedAgo]],
    ["説明文", pr.body.split("\n")],
    ["タイムライン", pr.timeline],
    ["チェック", pr.checks.map((c) => `${c.name}: ${checkStatus[c.status]}`)],
    ["ラベル", pr.labels],
    ["変更ファイル数", [String(pr.filesChanged)]],
    ["追加行数", [String(pr.additions)]],
    ["削除行数", [String(pr.deletions)]],
  ];
}

/**
 * 届いたプルリクエスト `received` のうち、いつもどおりの `normal` にはない行に印をつけて、その項目を返す。
 * 答え合わせでは、いつもの内容は見せずに、気づくべきだったところだけを指し示す。
 */
export function markAnomaly(normal: PullRequest, received: PullRequest): FieldMarks[] {
  const receivedFields = fields(received);
  return fields(normal).flatMap(([label, lines], index) => {
    const marked = diffLines(lines, receivedFields[index]![1])
      .filter((l) => l.kind !== "del")
      .map((l) => ({ text: l.text, marked: l.kind === "add" }));
    if (!marked.some((l) => l.marked)) return [];
    return [{ label, lines: trimContext(marked, 1) }];
  });
}
