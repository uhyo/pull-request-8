import { describe, expect, it } from "vitest";
import { clonePullRequest } from "../pr";
import { allAnomalies, anomaliesFor, levels, type ProblemSet } from ".";

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

describe.each(playable)("problems of %s", (_, problems: ProblemSet) => {
  it("have pull requests with unique ids and titles", () => {
    const { baselines } = problems;
    expect(baselines.length).toBeGreaterThan(0);
    expect(new Set(baselines.map((b) => b.id)).size).toBe(baselines.length);
    expect(new Set(baselines.map((b) => b.pullRequest.title)).size).toBe(baselines.length);
  });

  it("have anomalies with unique ids and names across the level", () => {
    const anomalies = allAnomalies(problems);
    expect(new Set(anomalies.map((a) => a.id)).size).toBe(anomalies.length);
    expect(new Set(anomalies.map((a) => a.name)).size).toBe(anomalies.length);
  });

  describe.each(problems.baselines.map((b) => [b.id, b] as const))("%s", (baselineId, baseline) => {
    const base = baseline.pullRequest;

    // どのプルリクエストにも起こる異変も含めて、すべて当てはまること
    it.each(anomaliesFor(problems, baselineId).map((a) => [a.id, a] as const))(
      "%s changes the pull request",
      (_, anomaly) => {
        const changed = anomaly.apply(clonePullRequest(base));
        expect(changed).not.toEqual(base);
      },
    );

    it("is not mutated by its anomalies", () => {
      const snapshot = clonePullRequest(base);
      for (const a of anomaliesFor(problems, baselineId)) a.apply(base);
      expect(base).toEqual(snapshot);
    });
  });
});
