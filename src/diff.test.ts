import { describe, expect, it } from "vitest";
import { diffLines, diffPullRequests, trimContext } from "./diff";
import { anomaliesFor, levels } from "./levels";
import { easy } from "./levels/easy";

describe("diff", () => {
  it("finds added, deleted and replaced lines", () => {
    expect(diffLines(["a", "b", "c"], ["a", "x", "c", "d"])).toEqual([
      { kind: "same", text: "a" },
      { kind: "del", text: "b" },
      { kind: "add", text: "x" },
      { kind: "same", text: "c" },
      { kind: "add", text: "d" },
    ]);
  });

  it("keeps only the lines around changes", () => {
    const lines = diffLines(["1", "2", "3", "4", "5", "6"], ["1", "2", "3", "4", "5", "X"]);
    expect(trimContext(lines, 1)).toEqual([
      null,
      { kind: "same", text: "5" },
      { kind: "del", text: "6" },
      { kind: "add", text: "X" },
    ]);
  });

  it("reports nothing for the same pull request", () => {
    const pr = easy.baselines[0]!.pullRequest;
    expect(diffPullRequests(pr, pr)).toEqual([]);
  });

  it("reports changes outside the description", () => {
    const baseline = easy.baselines[0]!;
    const impostor = anomaliesFor(easy, baseline.id).find((a) => a.id === "impostor")!;
    const diffs = diffPullRequests(baseline.pullRequest, impostor.apply(baseline.pullRequest));
    expect(diffs.map((d) => d.label)).toEqual(["作成者", "タイムライン"]);
  });

  // 見逃した異変を確認するときに、何も表示されない異変がないこと
  it("shows every anomaly", () => {
    for (const { problems } of levels) {
      for (const { id, pullRequest } of problems?.baselines ?? []) {
        for (const anomaly of anomaliesFor(problems!, id)) {
          expect(diffPullRequests(pullRequest, anomaly.apply(pullRequest)), anomaly.id).not.toEqual([]);
        }
      }
    }
  });
});
