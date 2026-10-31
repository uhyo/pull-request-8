import type { Anomaly } from "../anomalies";
import type { PullRequest } from "../pr";
import { easy } from "./easy";
import { hard } from "./hard";
import { normal } from "./normal";

/** 「いつもの」プルリクエストの 1 つと、それだけに起こる異変 */
export interface Baseline {
  id: string;
  /**
   * 異変のない状態のプルリクエスト。
   * プレイヤーは同じ AI の「いつもの」書き方を覚え、ここから外れたもの（異変）を見つける。
   */
  pullRequest: PullRequest;
  anomalies: readonly Anomaly[];
  /** このプルリクエストを #8 としてマージしたときに、クリア画面に表示するひとこと */
  mergedMessage: string;
}

/** 1 つの難易度で使うプルリクエストと異変 */
export interface ProblemSet {
  /** 毎回このうちどれかが届く */
  baselines: readonly Baseline[];
  /** どのプルリクエストにも起こりうる異変 */
  commonAnomalies: readonly Anomaly[];
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
  { id: "normal", name: "ふつう", description: "長めの説明文のプルリクエスト", problems: normal },
  { id: "hard", name: "むずかしい", description: "長く込み入った説明文のプルリクエスト", problems: hard },
];

/** 問題を用意してある難易度 */
export type PlayableLevel = Level & { problems: ProblemSet };

export function isPlayable(l: Level): l is PlayableLevel {
  return l.problems !== null;
}

export function findLevel(id: string): Level | undefined {
  return levels.find((l) => l.id === id);
}

export function findBaseline(problems: ProblemSet, id: string): Baseline {
  const baseline = problems.baselines.find((b) => b.id === id);
  if (!baseline) throw new Error(`unknown baseline: ${id}`);
  return baseline;
}

/** その難易度のすべての異変（図鑑に並ぶもの） */
export function allAnomalies(problems: ProblemSet): Anomaly[] {
  return [...problems.baselines.flatMap((b) => b.anomalies), ...problems.commonAnomalies];
}

/** `baselineId` のプルリクエストに起こりうる異変 */
export function anomaliesFor(problems: ProblemSet, baselineId: string): Anomaly[] {
  return [...findBaseline(problems, baselineId).anomalies, ...problems.commonAnomalies];
}
