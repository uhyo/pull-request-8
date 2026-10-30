import type { Anomaly } from "../anomalies";
import type { PullRequest } from "../pr";
import { easy } from "./easy";

/** 1 つの難易度で使う「いつもの」プルリクエストと、その異変 */
export interface ProblemSet {
  /**
   * 毎回提示される「いつもの」プルリクエスト。
   * プレイヤーはこれを覚え、ここから外れたもの（異変）を見つける。
   */
  pullRequest: PullRequest;
  anomalies: readonly Anomaly[];
  /** クリア画面に表示する、マージされた結果のひとこと */
  mergedMessage: string;
}

export type LevelId = "easy" | "normal" | "hard";

export interface Level {
  id: LevelId;
  name: string;
  description: string;
  /** まだ問題を用意していない難易度は null（準備中） */
  problems: ProblemSet | null;
}

/** 難しい難易度ほど、説明文が長く込み入ったプルリクエストになる */
export const levels: readonly Level[] = [
  { id: "easy", name: "かんたん", description: "短い説明文のプルリクエスト", problems: easy },
  { id: "normal", name: "ふつう", description: "長めの説明文のプルリクエスト", problems: null },
  { id: "hard", name: "むずかしい", description: "長く込み入った説明文のプルリクエスト", problems: null },
];

export function findLevel(id: string): Level | undefined {
  return levels.find((l) => l.id === id);
}
