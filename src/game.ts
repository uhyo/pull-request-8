import { allAnomalies, anomaliesFor, findBaseline, type ProblemSet } from "./levels";
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
  /** 届いたプルリクエスト（`Baseline` の id） */
  baselineId: string;
  anomalyId: string | null;
}

export interface GameState {
  /** 選んだ難易度の問題 */
  problems: ProblemSet;
  round: Round;
  /** まだ届いていないプルリクエスト */
  baselineBag: string[];
  /** まだ出ていない異変 */
  anomalyBag: string[];
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

/**
 * 袋から `accept` を満たす最初の要素を取り出す。
 * 見つからなければ、新しいひと揃い（`refill`）を袋の後ろに足してから探す。
 */
function takeFromBag(
  bag: string[],
  refill: () => string[],
  accept: (item: string) => boolean,
): { item: string | null; bag: string[] } {
  for (const candidates of [bag, [...bag, ...refill()]]) {
    const index = candidates.findIndex(accept);
    if (index !== -1) {
      return { item: candidates[index]!, bag: candidates.filter((_, i) => i !== index) };
    }
  }
  return { item: null, bag };
}

/** すべてのプルリクエストが一巡するまで同じものは届かず、2 回続けて同じものも届かない */
function drawBaseline(
  problems: ProblemSet,
  bag: string[],
  previous: string | null,
  random: Random,
): { baselineId: string; bag: string[] } {
  const ids = problems.baselines.map((b) => b.id);
  const { item, bag: rest } = takeFromBag(
    bag,
    () => shuffle(ids, random),
    (id) => id !== previous || ids.length === 1,
  );
  if (item === null) throw new Error("no pull requests to draw");
  return { baselineId: item, bag: rest };
}

/** すべての異変が一巡するまで、なるべく同じ異変は出さない */
function drawAnomaly(
  problems: ProblemSet,
  bag: string[],
  baselineId: string,
  random: Random,
): { anomalyId: string | null; bag: string[] } {
  const possible = new Set(anomaliesFor(problems, baselineId).map((a) => a.id));
  const { item, bag: rest } = takeFromBag(
    bag,
    () => shuffle(allAnomalies(problems).map((a) => a.id), random),
    (id) => possible.has(id),
  );
  return { anomalyId: item, bag: rest };
}

function drawRound(
  state: GameState,
  number: number,
  random: Random,
): Pick<GameState, "round" | "baselineBag" | "anomalyBag"> {
  const { problems } = state;
  const { baselineId, bag: baselineBag } = drawBaseline(
    problems,
    state.baselineBag,
    state.round.baselineId,
    random,
  );
  // ゴールのプルリクエストは常に正常
  if (number >= GOAL || random() >= ANOMALY_RATE) {
    return { round: { number, baselineId, anomalyId: null }, baselineBag, anomalyBag: state.anomalyBag };
  }
  const { anomalyId, bag: anomalyBag } = drawAnomaly(problems, state.anomalyBag, baselineId, random);
  return { round: { number, baselineId, anomalyId }, baselineBag, anomalyBag };
}

export function newGame(problems: ProblemSet, random: Random): GameState {
  const { baselineId, bag } = drawBaseline(problems, [], null, random);
  // 最初の 1 回は「いつもの」書き方を覚えてもらうために必ず正常
  return {
    problems,
    round: { number: START, baselineId, anomalyId: null },
    baselineBag: bag,
    anomalyBag: [],
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
  const drawn = drawRound(state, nextNumber, random);
  return { correct, state: { ...state, ...drawn, reviews, mistakes, cleared: false } };
}

export function pullRequestFor(problems: ProblemSet, round: Round): PullRequest {
  const base = clonePullRequest(findBaseline(problems, round.baselineId).pullRequest);
  if (round.anomalyId === null) return base;
  const anomaly = anomaliesFor(problems, round.baselineId).find((a) => a.id === round.anomalyId);
  if (!anomaly) throw new Error(`anomaly ${round.anomalyId} cannot happen to ${round.baselineId}`);
  return anomaly.apply(base);
}
