import { describe, expect, it } from "vitest";
import { clonePullRequest } from "../pr";
import { levels, type ProblemSet } from ".";

const playable = levels.flatMap((l) => (l.problems ? [[l.id, l.problems] as const] : []));

describe("levels", () => {
  it("have unique ids and names", () => {
    expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length);
    expect(new Set(levels.map((l) => l.name)).size).toBe(levels.length);
  });

  it("include at least one playable level", () => {
    expect(playable.length).toBeGreaterThan(0);
  });
});

describe.each(playable)("anomalies of %s", (_, problems: ProblemSet) => {
  const base = problems.pullRequest;

  it("have unique ids and names", () => {
    const { anomalies } = problems;
    expect(new Set(anomalies.map((a) => a.id)).size).toBe(anomalies.length);
    expect(new Set(anomalies.map((a) => a.name)).size).toBe(anomalies.length);
  });

  it.each(problems.anomalies.map((a) => [a.id, a] as const))("%s changes the pull request", (_, anomaly) => {
    const changed = anomaly.apply(clonePullRequest(base));
    expect(changed).not.toEqual(base);
  });

  it("do not mutate the base pull request", () => {
    const snapshot = clonePullRequest(base);
    for (const a of problems.anomalies) a.apply(base);
    expect(base).toEqual(snapshot);
  });
});
