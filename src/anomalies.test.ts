import { describe, expect, it } from "vitest";
import { anomalies } from "./anomalies";
import { basePullRequest, clonePullRequest } from "./pr";

describe("anomalies", () => {
  it("have unique ids and names", () => {
    expect(new Set(anomalies.map((a) => a.id)).size).toBe(anomalies.length);
    expect(new Set(anomalies.map((a) => a.name)).size).toBe(anomalies.length);
  });

  it.each(anomalies.map((a) => [a.id, a] as const))("%s changes the pull request", (_, anomaly) => {
    const changed = anomaly.apply(clonePullRequest(basePullRequest));
    expect(changed).not.toEqual(basePullRequest);
  });

  it("do not mutate the base pull request", () => {
    const snapshot = clonePullRequest(basePullRequest);
    for (const a of anomalies) a.apply(basePullRequest);
    expect(basePullRequest).toEqual(snapshot);
  });
});
