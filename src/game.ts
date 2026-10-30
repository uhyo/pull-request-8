import type { ProblemSet } from "./levels";
import { clonePullRequest, type PullRequest } from "./pr";

/** 最初のプルリクエスト番号。間違えるとここに戻る */
export const START = 1;
/** このプルリクエスト番号を正しく承認したらマージしてクリア */
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
  /** 選んだ難易度の問題 */
  problems: ProblemSet;
  round: Round;
  /** まだ出ていない異変。空になったら補充する */
  bag: string[];
  reviews: number;
  mistakes: number;
  /** ゴールのプルリクエストを正しく承認した */
  cleared: boolean;
}

function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function shuffledIds(problems: ProblemSet, random: Random): string[] {
  return shuffle(problems.anomalies.map((a) => a.id), random);
}

function drawRound(
  problems: ProblemSet,
  number: number,
  bag: string[],
  random: Random,
): { round: Round; bag: string[] } {
  // ゴールのプルリクエストは常に正常
  if (number >= GOAL || random() >= ANOMALY_RATE) {
    return { round: { number, anomalyId: null }, bag };
  }
  const filled = bag.length > 0 ? bag : shuffledIds(problems, random);
  const [anomalyId, ...rest] = filled;
  return { round: { number, anomalyId: anomalyId ?? null }, bag: rest };
}

export function newGame(problems: ProblemSet, random: Random): GameState {
  // 最初の 1 回は「いつもの」プルリクエストを覚えてもらうために必ず正常
  return {
    problems,
    round: { number: START, anomalyId: null },
    bag: shuffledIds(problems, random),
    reviews: 0,
    mistakes: 0,
    cleared: false,
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
  if (correct && state.round.number >= GOAL) {
    return { correct, state: { ...state, reviews, mistakes, cleared: true } };
  }
  const nextNumber = correct ? state.round.number + 1 : START;
  const { round, bag } = drawRound(state.problems, nextNumber, state.bag, random);
  return { correct, state: { ...state, round, bag, reviews, mistakes, cleared: false } };
}

export function pullRequestFor(problems: ProblemSet, round: Round): PullRequest {
  const base = clonePullRequest(problems.pullRequest);
  if (round.anomalyId === null) return base;
  const anomaly = problems.anomalies.find((a) => a.id === round.anomalyId);
  if (!anomaly) throw new Error(`unknown anomaly: ${round.anomalyId}`);
  return anomaly.apply(base);
}
