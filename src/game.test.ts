import { describe, expect, it } from "vitest";
import {
  GOAL,
  START,
  isCorrect,
  newGame,
  pullRequestFor,
  submitReview,
  type GameState,
  type Random,
} from "./game";
import { allAnomalies, type ProblemSet } from "./levels";
import { easy } from "./levels/easy";

/** 異変を必ず起こす / 起こさない乱数 */
const always = () => 0;
const never = () => 0.99;

/** 再現できる乱数（mulberry32） */
function seeded(seed: number): Random {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 判断を間違え続けて #1 と #2 を行き来しながら、届いたラウンドを集める */
function playRounds(problems: ProblemSet, random: Random, count: number): GameState["round"][] {
  let state = newGame(problems, random);
  const rounds = [state.round];
  while (rounds.length < count) {
    const wrong = state.round.anomalyId === null ? "request-changes" : "approve";
    // #1 は必ず正常なので、ときどき正しく承認して #2 以降も出す
    const verdict = state.round.number === START ? "approve" : wrong;
    state = submitReview(state, verdict, random).state;
    rounds.push(state.round);
  }
  return rounds;
}

describe("game", () => {
  it("starts at #1 with a normal pull request", () => {
    const state = newGame(easy, always);
    expect(START).toBe(1);
    expect(state.round.number).toBe(START);
    expect(state.round.anomalyId).toBeNull();
    expect(easy.baselines.map((b) => b.id)).toContain(state.round.baselineId);
  });

  it("judges verdicts", () => {
    const round = { number: 0, baselineId: "x" };
    expect(isCorrect({ ...round, anomalyId: null }, "approve")).toBe(true);
    expect(isCorrect({ ...round, anomalyId: null }, "request-changes")).toBe(false);
    expect(isCorrect({ ...round, anomalyId: "x" }, "request-changes")).toBe(true);
    expect(isCorrect({ ...round, anomalyId: "x" }, "approve")).toBe(false);
  });

  it("advances on a correct review and resets on a mistake", () => {
    let state = newGame(easy, always);
    state = submitReview(state, "approve", always).state;
    expect(state.round.number).toBe(START + 1);
    expect(state.round.anomalyId).not.toBeNull();

    const result = submitReview(state, "approve", always);
    expect(result.correct).toBe(false);
    expect(result.state.round.number).toBe(START);
    expect(result.state.mistakes).toBe(1);
    expect(result.state.reviews).toBe(2);
  });

  it("reaches the goal with a normal pull request and clears by approving it", () => {
    let state: GameState = newGame(easy, always);
    // 異変がない #1 を承認し、以降は異変を見抜き続ける
    state = submitReview(state, "approve", always).state;
    while (state.round.number < GOAL) {
      state = submitReview(state, "request-changes", always).state;
    }
    expect(state.round.number).toBe(GOAL);
    expect(state.round.anomalyId).toBeNull();
    expect(state.cleared).toBe(false);

    const result = submitReview(state, "approve", always);
    expect(result.correct).toBe(true);
    expect(result.state.cleared).toBe(true);
    expect(result.state.reviews).toBe(GOAL - START + 1);
  });

  it("goes back to #1 when changes are requested on the goal", () => {
    let state: GameState = newGame(easy, never);
    while (state.round.number < GOAL) state = submitReview(state, "approve", never).state;
    const result = submitReview(state, "request-changes", never);
    expect(result.correct).toBe(false);
    expect(result.state.cleared).toBe(false);
    expect(result.state.round.number).toBe(START);
  });

  it("sends every pull request in turn, never the same one twice in a row", () => {
    const ids = easy.baselines.map((b) => b.id);
    const rounds = playRounds(easy, seeded(1), ids.length * 20);
    for (let i = 1; i < rounds.length; i++) {
      expect(rounds[i]!.baselineId).not.toBe(rounds[i - 1]!.baselineId);
    }
    // 一巡目ではすべてのプルリクエストが 1 回ずつ届く
    expect(new Set(rounds.slice(0, ids.length).map((r) => r.baselineId))).toEqual(new Set(ids));
  });

  it("only picks anomalies that fit the pull request", () => {
    for (const round of playRounds(easy, seeded(2), 500)) {
      expect(() => pullRequestFor(easy, round)).not.toThrow();
    }
  });

  it("shows every anomaly sooner or later", () => {
    const seen = new Set(playRounds(easy, seeded(3), 2000).map((r) => r.anomalyId));
    for (const a of allAnomalies(easy)) expect(seen).toContain(a.id);
  });

  it("does not repeat an anomaly until all have appeared", () => {
    const single: ProblemSet = { ...easy, baselines: easy.baselines.slice(0, 1) };
    const count = allAnomalies(single).length;
    let state = newGame(single, always);
    state = submitReview(state, "approve", always).state;
    const seen: string[] = [];
    for (let i = 0; i < count; i++) {
      seen.push(state.round.anomalyId!);
      // 間違えて #1 に戻り続ける
      state = submitReview(state, "approve", always).state;
    }
    expect(new Set(seen).size).toBe(count);
  });

  it("draws anomalies only from the chosen problem set", () => {
    const tiny: ProblemSet = {
      baselines: easy.baselines.map((b) => ({ ...b, anomalies: [] })),
      commonAnomalies: easy.commonAnomalies.slice(0, 2),
    };
    const ids = new Set(tiny.commonAnomalies.map((a) => a.id));
    for (const round of playRounds(tiny, always, 12)) {
      if (round.anomalyId !== null) expect(ids.has(round.anomalyId)).toBe(true);
    }
  });
});
