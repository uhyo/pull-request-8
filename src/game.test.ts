import { describe, expect, it } from "vitest";
import { GOAL, START, isCorrect, newGame, submitReview, type GameState } from "./game";
import { easy } from "./levels/easy";

/** 異変を必ず起こす / 起こさない乱数 */
const always = () => 0;
const never = () => 0.99;

describe("game", () => {
  it("starts at #1 with a normal pull request", () => {
    const state = newGame(easy, always);
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
    expect(state.round).toEqual({ number: GOAL, anomalyId: null });
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

  it("does not repeat an anomaly until all have appeared", () => {
    let state = newGame(easy, always);
    state = submitReview(state, "approve", always).state;
    const seen: string[] = [];
    for (let i = 0; i < easy.anomalies.length; i++) {
      seen.push(state.round.anomalyId!);
      // 間違えて #1 に戻り続ける
      state = submitReview(state, "approve", always).state;
    }
    expect(new Set(seen).size).toBe(easy.anomalies.length);
  });

  it("draws anomalies only from the chosen problem set", () => {
    const tiny = { ...easy, anomalies: easy.anomalies.slice(0, 2) };
    let state = newGame(tiny, always);
    state = submitReview(state, "approve", always).state;
    const ids = new Set(tiny.anomalies.map((a) => a.id));
    for (let i = 0; i < 6; i++) {
      expect(ids.has(state.round.anomalyId!)).toBe(true);
      state = submitReview(state, "approve", always).state;
    }
  });
});
