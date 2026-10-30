import { describe, expect, it } from "vitest";
import { anomalies } from "./anomalies";
import { GOAL, isCorrect, isGoal, newGame, submitReview, type GameState } from "./game";

/** 異変を必ず起こす / 起こさない乱数 */
const always = () => 0;
const never = () => 0.99;

describe("game", () => {
  it("starts at #0 with a normal pull request", () => {
    const state = newGame(always);
    expect(state.round).toEqual({ number: 0, anomalyId: null });
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
    expect(state.round.number).toBe(1);
    expect(state.round.anomalyId).not.toBeNull();

    const result = submitReview(state, "approve", always);
    expect(result.correct).toBe(false);
    expect(result.state.round.number).toBe(0);
    expect(result.state.mistakes).toBe(1);
    expect(result.state.reviews).toBe(2);
  });

  it("reaches the goal with a normal pull request", () => {
    let state: GameState = newGame(never);
    for (let i = 0; i < GOAL; i++) state = submitReview(state, "approve", never).state;
    expect(isGoal(state)).toBe(true);
    expect(state.round).toEqual({ number: GOAL, anomalyId: null });
  });

  it("does not repeat an anomaly until all have appeared", () => {
    let state = newGame(always);
    state = submitReview(state, "approve", always).state;
    const seen: string[] = [];
    for (let i = 0; i < anomalies.length; i++) {
      seen.push(state.round.anomalyId!);
      // 間違えて #0 に戻り続ける
      state = submitReview(state, "approve", always).state;
    }
    expect(new Set(seen).size).toBe(anomalies.length);
  });
});
