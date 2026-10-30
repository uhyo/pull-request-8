import { anomalies, findAnomaly } from "./anomalies";
import { basePullRequest, clonePullRequest, type PullRequest } from "./pr";

/** このプルリクエスト番号に到達したらマージできる */
export const GOAL = 8;
/** 各ラウンドで異変が起きる確率 */
export const ANOMALY_RATE = 0.6;

export type Verdict = "approve" | "request-changes";
export type Random = () => number;

export interface Round {
  /** 画面に表示するプルリクエスト番号（= 現在の進捗） */
  number: number;
  anomalyId: string | null;
}

export interface GameState {
  round: Round;
  /** まだ出ていない異変。空になったら補充する */
  bag: string[];
  reviews: number;
  mistakes: number;
}

function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function drawRound(number: number, bag: string[], random: Random): { round: Round; bag: string[] } {
  // ゴールのプルリクエストは常に正常
  if (number >= GOAL || random() >= ANOMALY_RATE) {
    return { round: { number, anomalyId: null }, bag };
  }
  const filled = bag.length > 0 ? bag : shuffle(anomalies.map((a) => a.id), random);
  const [anomalyId, ...rest] = filled;
  return { round: { number, anomalyId: anomalyId ?? null }, bag: rest };
}

export function newGame(random: Random): GameState {
  // 最初の 1 回は「いつもの」プルリクエストを覚えてもらうために必ず正常
  return {
    round: { number: 0, anomalyId: null },
    bag: shuffle(anomalies.map((a) => a.id), random),
    reviews: 0,
    mistakes: 0,
  };
}

export function isCorrect(round: Round, verdict: Verdict): boolean {
  return (round.anomalyId !== null) === (verdict === "request-changes");
}

export function submitReview(
  state: GameState,
  verdict: Verdict,
  random: Random,
): { state: GameState; correct: boolean } {
  const correct = isCorrect(state.round, verdict);
  const nextNumber = correct ? state.round.number + 1 : 0;
  const { round, bag } = drawRound(nextNumber, state.bag, random);
  return {
    correct,
    state: {
      round,
      bag,
      reviews: state.reviews + 1,
      mistakes: state.mistakes + (correct ? 0 : 1),
    },
  };
}

export function isGoal(state: GameState): boolean {
  return state.round.number >= GOAL;
}

export function pullRequestFor(round: Round): PullRequest {
  const base = clonePullRequest(basePullRequest);
  if (round.anomalyId === null) return base;
  const anomaly = findAnomaly(round.anomalyId);
  if (!anomaly) throw new Error(`unknown anomaly: ${round.anomalyId}`);
  return anomaly.apply(base);
}
