import type { PullRequest } from "../pr";

/** codebot[bot] のプルリクエストで毎回同じになる部分 */
type Fixed = "author" | "checks" | "timeline" | "notice";

/**
 * codebot[bot] のプルリクエストを作る。
 *
 * 説明文の書き方は難易度ごとに決まっていて、それぞれの `common.ts` に書いてある。
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
