import { anomalies, findAnomaly } from "./anomalies";
import { basePullRequest, clonePullRequest, type PullRequest } from "./pr";

/** 最初のプルリクエスト番号。間違えるとここに戻る */
export const START = 1;
/** このプルリクエスト番号を承認できたらマージできる */
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
  /** #GOAL を正しく承認し、マージを待っている */
  approved: boolean;
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
  if (random() >= ANOMALY_RATE) {
    return { round: { number, anomalyId: null }, bag };
  }
  const filled = bag.length > 0 ? bag : shuffle(anomalies.map((a) => a.id), random);
  const [anomalyId, ...rest] = filled;
  return { round: { number, anomalyId: anomalyId ?? null }, bag: rest };
}

export function newGame(random: Random): GameState {
  // 最初の 1 回は「いつもの」プルリクエストを覚えてもらうために必ず正常
  return {
    round: { number: START, anomalyId: null },
    bag: shuffle(anomalies.map((a) => a.id), random),
    approved: false,
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
  const reviews = state.reviews + 1;
  const mistakes = state.mistakes + (correct ? 0 : 1);
  const atGoal = state.round.number >= GOAL;

  // 異変のない #GOAL を承認できたら、同じプルリクエストをマージできる
  if (correct && atGoal && verdict === "approve") {
    return { correct, state: { ...state, approved: true, reviews, mistakes } };
  }

  // #GOAL に異変があった場合は、作り直された #GOAL をもう一度レビューする
  const nextNumber = !correct ? START : atGoal ? GOAL : state.round.number + 1;
  const { round, bag } = drawRound(nextNumber, state.bag, random);
  return { correct, state: { round, bag, approved: false, reviews, mistakes } };
}

export function isMergeable(state: GameState): boolean {
  return state.approved;
}

export function pullRequestFor(round: Round): PullRequest {
  const base = clonePullRequest(basePullRequest);
  if (round.anomalyId === null) return base;
  const anomaly = findAnomaly(round.anomalyId);
  if (!anomaly) throw new Error(`unknown anomaly: ${round.anomalyId}`);
  return anomaly.apply(base);
}
