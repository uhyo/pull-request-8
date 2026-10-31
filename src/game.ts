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
  /** 直前に判断を間違えたラウンド。答え合わせに使う（見つけた異変には数えない） */
  missed: Round | null;
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
    missed: null,
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
    return { correct, state: { ...state, reviews, mistakes, cleared: true, missed: null } };
  }
  const nextNumber = correct ? state.round.number + 1 : START;
  const drawn = drawRound(state, nextNumber, random);
  const missed = correct ? null : state.round;
  return { correct, state: { ...state, ...drawn, reviews, mistakes, cleared: false, missed } };
}

/** 異変のない状態のプルリクエスト（答え合わせで、届いたもののどこに異変があったかを求めるのに使う） */
export function normalPullRequestFor(problems: ProblemSet, round: Round): PullRequest {
  return pullRequestFor(problems, { ...round, anomalyId: null });
}

export function pullRequestFor(problems: ProblemSet, round: Round): PullRequest {
  const base = clonePullRequest(findBaseline(problems, round.baselineId).pullRequest);
  if (round.anomalyId === null) return base;
  const anomaly = anomaliesFor(problems, round.baselineId).find((a) => a.id === round.anomalyId);
  if (!anomaly) throw new Error(`anomaly ${round.anomalyId} cannot happen to ${round.baselineId}`);
  return anomaly.apply(base);
}

/** ゲームの進行のうち、保存しておくもの（問題は難易度から引き直す） */
export type SavedGame = Omit<GameState, "problems">;

export function saveGame({ problems: _, ...saved }: GameState): SavedGame {
  return saved;
}

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

function restoreRound(problems: ProblemSet, value: unknown): Round | null {
  if (typeof value !== "object" || value === null) return null;
  const { number, baselineId, anomalyId } = value as Record<string, unknown>;
  if (!Number.isInteger(number) || (number as number) < START || (number as number) > GOAL) return null;
  if (!problems.baselines.some((b) => b.id === baselineId)) return null;
  const id = baselineId as string;
  if (anomalyId !== null && !anomaliesFor(problems, id).some((a) => a.id === anomalyId)) return null;
  return { number: number as number, baselineId: id, anomalyId: anomalyId as string | null };
}

/** 袋からなくなったものを取り除く（足りなければ引くときに補充される） */
function restoreBag(value: unknown, known: readonly string[]): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((id): id is string => known.includes(id));
}

/**
 * 保存しておいた進行を元に戻す。
 * 問題が変わって元に戻せない（あるいは壊れている）ときは null
 */
export function restoreGame(problems: ProblemSet, saved: unknown): GameState | null {
  if (typeof saved !== "object" || saved === null) return null;
  const value = saved as Record<string, unknown>;
  const round = restoreRound(problems, value.round);
  const missed = value.missed === null ? null : restoreRound(problems, value.missed);
  const baselineBag = restoreBag(value.baselineBag, problems.baselines.map((b) => b.id));
  const anomalyBag = restoreBag(value.anomalyBag, allAnomalies(problems).map((a) => a.id));
  const { reviews, mistakes, cleared } = value;
  if (!round || (value.missed !== null && !missed) || !baselineBag || !anomalyBag) return null;
  if (!isCount(reviews) || !isCount(mistakes) || typeof cleared !== "boolean") return null;
  return { problems, round, baselineBag, anomalyBag, reviews, mistakes, cleared, missed };
}
