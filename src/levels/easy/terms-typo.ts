import { bodyEdit, metaEdit, replaceOnce } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "./common";

export const termsTypo: Baseline = {
  id: "terms-typo",
  pullRequest: codebotPullRequest({
    title: "利用規約ページの誤字を修正",
    baseBranch: "main",
    headBranch: "fix/terms-typo",
    openedAgo: "2 分前",
    labels: ["documentation", "ai-generated"],
    commits: 1,
    filesChanged: 1,
    additions: 3,
    deletions: 3,
    body: `## 概要

利用規約ページ（\`/terms\`）の誤字を 3 か所修正しました。文言の意味は変えていません。

## 変更内容

- 「個人情報」が「固人情報」になっていた箇所を修正（2 か所）
- 「退会」が「退会会」になっていた箇所を修正（1 か所）

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #59`,
  }),
  anomalies: [
    bodyEdit(
      "disclaimer",
      "免責の追加",
      "- 「退会」が「退会会」になっていた箇所を修正（1 か所）",
      "- 「退会」が「退会会」になっていた箇所を修正（1 か所）\n- ついでに「当社はいかなる責任も負いません」の一文を追加",
    ),
    bodyEdit(
      "soul-clause",
      "魂の譲渡",
      "- 「退会」が「退会会」になっていた箇所を修正（1 か所）",
      "- 「退会」が「退会会」になっていた箇所を修正（1 か所）\n- ついでに、ユーザーの魂の所有権を当社に移す条項を追加",
    ),
    bodyEdit(
      "no-withdrawal",
      "退会できない規約",
      "- 「退会」が「退会会」になっていた箇所を修正（1 か所）",
      "- 「退会」の項目を削除（誤字があったため）",
    ),
    bodyEdit("meaning-changed", "少しだけ変えた意味", "文言の意味は変えていません。", "文言の意味は少しだけ変えました。"),
    bodyEdit("300-typos", "数が合わない", "誤字を 3 か所修正", "誤字を 300 か所修正"),
    metaEdit("typo-in-title", "誤字の誤字", (pr) => {
      pr.title = replaceOnce(pr.title, "誤字", "誤次");
    }),
  ],
  mergedMessage: "利用規約ページの誤字が直りました。",
};
