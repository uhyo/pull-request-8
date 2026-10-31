import { describe, expect, it } from "vitest";
import { diffLines, markAnomaly, trimContext } from "./diff";
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

  it("keeps only the lines around marked ones", () => {
    const lines = ["1", "2", "3", "4", "5", "6"].map((text) => ({ text, marked: text === "5" }));
    expect(trimContext(lines, 1)).toEqual([
      null,
      { text: "4", marked: false },
      { text: "5", marked: true },
      { text: "6", marked: false },
    ]);
  });

  it("marks nothing for the same pull request", () => {
    const pr = easy.baselines[0]!.pullRequest;
    expect(markAnomaly(pr, pr)).toEqual([]);
  });

  it("marks lines outside the description", () => {
    const baseline = easy.baselines[0]!;
    const impostor = anomaliesFor(easy, baseline.id).find((a) => a.id === "impostor")!;
    const fields = markAnomaly(baseline.pullRequest, impostor.apply(baseline.pullRequest));
    expect(fields.map((f) => f.label)).toEqual(["作成者", "タイムライン"]);
    expect(fields[0]!.lines).toEqual([{ text: "c0debot[bot]", marked: true }]);
  });

  // いつもどおりの内容は見せず、届いたプルリクエストの行だけを指し示す
  it("shows only lines of the received pull request", () => {
    const baseline = easy.baselines[0]!;
    const anomaly = anomaliesFor(easy, baseline.id).find((a) => a.id === "tested-in-prod")!;
    const received = anomaly.apply(baseline.pullRequest);
    const lines = markAnomaly(baseline.pullRequest, received).flatMap((f) => f.lines);
    expect(lines.filter((l) => l?.marked)).toEqual([{ text: "- [x] 本番環境で動作確認", marked: true }]);
    for (const line of lines) {
      if (line) expect(received.body.split("\n")).toContain(line.text);
    }
  });

  // 見逃した異変を確認するときに、何も指し示されない異変がないこと
  it("points to every anomaly", () => {
    for (const { problems } of levels) {
      for (const { id, pullRequest } of problems?.baselines ?? []) {
        for (const anomaly of anomaliesFor(problems!, id)) {
          const lines = markAnomaly(pullRequest, anomaly.apply(pullRequest)).flatMap((f) => f.lines);
          expect(lines.some((l) => l?.marked), anomaly.id).toBe(true);
        }
      }
    }
  });
});
