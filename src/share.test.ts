import { describe, expect, it } from "vitest";
import { clearShareText, gameUrl, xShareUrl } from "./share";

describe("clearShareText", () => {
  it("includes the level and the stats", () => {
    expect(clearShareText({ levelName: "ふつう", reviews: 12, mistakes: 3, found: 5, totalAnomalies: 30 })).toBe(
      "「プルリクエスト #8」をふつうでクリアしました！\nレビュー 12 回・判断ミス 3 回・見つけた異変 5 / 30",
    );
  });

  it("leaves out the anomaly count before any anomaly is found", () => {
    expect(clearShareText({ levelName: "かんたん", reviews: 8, mistakes: 0, found: 0, totalAnomalies: 20 })).toBe(
      "「プルリクエスト #8」をかんたんでクリアしました！\nレビュー 8 回・判断ミス 0 回",
    );
  });
});

describe("xShareUrl", () => {
  it("encodes the text and the game URL", () => {
    const url = new URL(xShareUrl("#8 を\nクリア"));
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe("#8 を\nクリア");
    expect(url.searchParams.get("url")).toBe(gameUrl);
  });
});
