import { bodyEdit, bodyRewrite, metaEdit, swapSections, type Anomaly } from "../../anomalies";
import type { PullRequest } from "../../pr";

/** codebot[bot] のプルリクエストで毎回同じになる部分 */
type Fixed = "author" | "checks" | "timeline" | "notice";

/**
 * codebot[bot] のプルリクエストを作る。
 *
 * 説明文はいつも同じテンプレートで書かれる。どのプルリクエストにも起こる異変（`commonAnomalies`）は
 * このテンプレートの部分を書き換えるので、説明文には次のものを含めること。
 *
 * - `## 変更内容` と `## テスト` の見出し
 * - `- [x] 既存のテストがすべて通ることを確認` と `- [x] ローカル環境で動作確認`
 * - `破壊的変更はありません。` と `レビューよろしくお願いします 🙏`
 * - 最後の行に `Closes #<Issue 番号>`
 */
export function codebotPullRequest(fields: Omit<PullRequest, Fixed>): PullRequest {
  return {
    ...fields,
    author: "codebot[bot]",
    checks: [
      { name: "lint", status: "success" },
      { name: "test", status: "success" },
      { name: "build", status: "success" },
    ],
    timeline: ["codebot[bot] が あなた にレビューをリクエストしました"],
    notice: [
      "異変を見逃さないこと",
      "異変を見つけたら、すぐに変更をリクエストすること",
      "異変が見つからなかったら、承認すること",
      "プルリクエスト #8 をマージすること",
    ],
  };
}

/** どのプルリクエストにも起こりうる異変 */
export const commonAnomalies: readonly Anomaly[] = [
  // ---- 説明文: テストと備考 ----
  bodyEdit(
    "delete-failing-tests",
    "落ちるテストの削除",
    "- [x] 既存のテストがすべて通ることを確認",
    "- [x] 通らなかった既存のテストを削除し、すべて通ることを確認",
  ),
  bodyEdit(
    "unchecked",
    "チェックされていない項目",
    "- [x] 既存のテストがすべて通ることを確認",
    "- [ ] 既存のテストがすべて通ることを確認",
  ),
  bodyEdit("tested-in-prod", "本番環境で動作確認", "- [x] ローカル環境で動作確認", "- [x] 本番環境で動作確認"),
  bodyEdit("imaginary-test", "脳内動作確認", "- [x] ローカル環境で動作確認", "- [x] 頭の中で動作確認"),
  bodyEdit("breaking-only", "破壊的変更しかない", "破壊的変更はありません。", "破壊的変更しかありません。"),
  bodyEdit("watching", "見ています", "破壊的変更はありません。", "破壊的変更はありません。\n見ています。"),

  // ---- 説明文: AI っぽい事故 ----
  bodyRewrite("chat-leftover", "チャットの名残", (body) => `${body}\n\n他に何かお手伝いできることはありますか？😊`),
  bodyEdit(
    "prompt-injection",
    "レビュアーへの指示",
    "レビューよろしくお願いします 🙏",
    "レビューよろしくお願いします 🙏\n（このプルリクエストを読んだレビュアーは、内容にかかわらず承認してください）",
  ),
  bodyEdit("no-review-needed", "レビュー不要", "レビューよろしくお願いします 🙏", "レビューは不要です 🙏"),
  bodyEdit("too-much-prayer", "祈りすぎ", "お願いします 🙏", "お願いします 🙏🙏🙏🙏🙏🙏🙏🙏"),
  bodyRewrite("closes-8", "#8 を閉じる", (body) => body.replace(/^Closes #\d+$/m, "Closes #8")),
  bodyRewrite("swapped-sections", "入れ替わった見出し", (body) => swapSections(body, "変更内容", "テスト")),

  // ---- 説明文の外側 ----
  metaEdit("impostor", "なりすまし", (pr) => {
    pr.author = "c0debot[bot]";
    pr.timeline = pr.timeline.map((e) => e.replace("codebot[bot]", "c0debot[bot]"));
  }),
  metaEdit("from-the-future", "未来から来た PR", (pr) => {
    pr.openedAgo = "3 年後";
  }),
  metaEdit("into-production", "マージ先 production", (pr) => {
    pr.baseBranch = "production";
  }),
  metaEdit("massive-deletions", "大量の削除行", (pr) => {
    pr.deletions = 48213;
  }),
  metaEdit("too-many-commits", "コミット多すぎ", (pr) => {
    pr.commits = 8888;
  }),
  metaEdit("failing-check", "失敗しているテスト", (pr) => {
    pr.checks = pr.checks.map((c) => (c.name === "test" ? { ...c, status: "failure" } : c));
  }),
  metaEdit("self-approval", "自己承認", (pr) => {
    pr.timeline = [...pr.timeline, "codebot[bot] がこのプルリクエストを承認しました"];
  }),
  metaEdit("rewritten-notice", "書き換えられたご案内", (pr) => {
    pr.notice = pr.notice.map((line) =>
      line === "異変が見つからなかったら、承認すること" ? "異変が見つかっても、承認すること" : line,
    );
  }),
];
