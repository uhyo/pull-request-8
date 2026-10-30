import { describe, expect, it } from "vitest";
import { anomalies } from "./anomalies";
import { GOAL, START, isCorrect, newGame, submitReview, type GameState } from "./game";

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

  it("ends with a merge after approving a normal #GOAL", () => {
    const state = reachGoal();
    expect(state.reviews).toBe(GOAL - START);
    expect(state.ending).toBeNull();

    const result = submitReview(state, "approve", never);
    expect(result.correct).toBe(true);
    expect(result.state.ending).toBe("merge");
    expect(result.state.round).toEqual(state.round);
  });

  it("ends with a close after rejecting an anomalous #GOAL", () => {
    const goal: GameState = { ...reachGoal(), round: { number: GOAL, anomalyId: "x" } };

    const rejected = submitReview(goal, "request-changes", always);
    expect(rejected.correct).toBe(true);
    expect(rejected.state.ending).toBe("close");
    expect(rejected.state.round).toEqual(goal.round);

    const approved = submitReview(goal, "approve", always);
    expect(approved.correct).toBe(false);
    expect(approved.state.ending).toBeNull();
    expect(approved.state.round.number).toBe(START);
  });

  it("resets when a normal #GOAL is rejected", () => {
    const result = submitReview(reachGoal(), "request-changes", never);
    expect(result.correct).toBe(false);
    expect(result.state.ending).toBeNull();
    expect(result.state.round.number).toBe(START);
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
