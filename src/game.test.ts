import { describe, expect, it } from "vitest";
import { anomalies } from "./anomalies";
import { GOAL, START, isCorrect, isMergeable, newGame, submitReview, type GameState } from "./game";

/** 異変を必ず起こす / 起こさない乱数 */
const always = () => 0;
const never = () => 0.99;

describe("game", () => {
  it("starts at #1 with a normal pull request", () => {
    const state = newGame(always);
    expect(START).toBe(1);
    expect(state.round).toEqual({ number: START, anomalyId: null });
  });

  it("judges verdicts", () => {
    expect(isCorrect({ number: 0, anomalyId: null }, "approve")).toBe(true);
    expect(isCorrect({ number: 0, anomalyId: null }, "request-changes")).toBe(false);
    expect(isCorrect({ number: 0, anomalyId: "x" }, "request-changes")).toBe(true);
    expect(isCorrect({ number: 0, anomalyId: "x" }, "approve")).toBe(false);
  });

  it("advances on a correct review and resets on a mistake", () => {
    let state = newGame(always);
    state = submitReview(state, "approve", always).state;
    expect(state.round.number).toBe(START + 1);
    expect(state.round.anomalyId).not.toBeNull();

    const result = submitReview(state, "approve", always);
    expect(result.correct).toBe(false);
    expect(result.state.round.number).toBe(START);
    expect(result.state.mistakes).toBe(1);
    expect(result.state.reviews).toBe(2);
  });

  /** 異変を起こさずに #GOAL まで進める */
  function reachGoal(): GameState {
    let state: GameState = newGame(never);
    while (state.round.number < GOAL) state = submitReview(state, "approve", never).state;
    return state;
  }

  it("becomes mergeable after approving a normal #GOAL", () => {
    const state = reachGoal();
    expect(state.reviews).toBe(GOAL - START);
    expect(isMergeable(state)).toBe(false);

    const result = submitReview(state, "approve", never);
    expect(result.correct).toBe(true);
    expect(isMergeable(result.state)).toBe(true);
    expect(result.state.round).toEqual(state.round);
  });

  it("can put an anomaly in #GOAL", () => {
    const state = submitReview(reachGoal(), "request-changes", always).state;
    expect(state.round.number).toBe(START);

    let goal = reachGoal();
    goal = { ...goal, round: { number: GOAL, anomalyId: "x" } };
    const approved = submitReview(goal, "approve", always);
    expect(approved.correct).toBe(false);
    expect(isMergeable(approved.state)).toBe(false);
    expect(approved.state.round.number).toBe(START);

    // 正しく変更をリクエストすると、作り直された #GOAL がもう一度届く
    const rejected = submitReview(goal, "request-changes", always);
    expect(rejected.correct).toBe(true);
    expect(isMergeable(rejected.state)).toBe(false);
    expect(rejected.state.round.number).toBe(GOAL);
    expect(rejected.state.round.anomalyId).not.toBeNull();
  });

  it("does not repeat an anomaly until all have appeared", () => {
    let state = newGame(always);
    state = submitReview(state, "approve", always).state;
    const seen: string[] = [];
    for (let i = 0; i < anomalies.length; i++) {
      seen.push(state.round.anomalyId!);
      // 間違えて #1 に戻り続ける
      state = submitReview(state, "approve", always).state;
    }
    expect(new Set(seen).size).toBe(anomalies.length);
  });
});
