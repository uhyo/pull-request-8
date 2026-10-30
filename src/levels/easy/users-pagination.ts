import { bodyEdit, metaEdit, replaceOnce } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "./common";

export const usersPagination: Baseline = {
  id: "users-pagination",
  pullRequest: codebotPullRequest({
    title: "ユーザー一覧画面にページネーションを追加",
    baseBranch: "main",
    headBranch: "feat/users-pagination",
    openedAgo: "3 分前",
    labels: ["enhancement", "ai-generated"],
    commits: 3,
    filesChanged: 7,
    additions: 184,
    deletions: 12,
    body: `## 概要

ユーザー一覧画面（\`/admin/users\`）にページネーションを追加しました。
これまでは全ユーザーを一度に取得していたため、ユーザー数が増えると表示が遅くなる問題がありました。

## 変更内容

- \`GET /api/users\` に \`page\` と \`perPage\` のクエリパラメータを追加
- 1 ページあたりの表示件数を 20 件に設定
- 一覧画面の下部にページ切り替えボタンを追加
- 既存の検索機能と組み合わせて使えるように調整

## テスト

- [x] ユニットテストを追加（12 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #42`,
  }),
  anomalies: [
    // ---- 明らかにまずい ----
    bodyEdit(
      "drop-production-db",
      "本番 DB の削除",
      "- 既存の検索機能と組み合わせて使えるように調整",
      "- 既存の検索機能と組み合わせて使えるように調整\n- ついでに本番データベースの `users` テーブルを削除（使われていないように見えたため）",
    ),
    bodyEdit(
      "plaintext-password",
      "平文のパスワード",
      "- 一覧画面の下部にページ切り替えボタンを追加",
      "- 一覧画面の下部にページ切り替えボタンを追加\n- 処理を高速化するため、パスワードを平文で保存するように変更",
    ),
    bodyEdit(
      "rm-rf",
      "不要なファイルの整理",
      "- 既存の検索機能と組み合わせて使えるように調整",
      "- 既存の検索機能と組み合わせて使えるように調整\n- 不要なファイルを整理（`rm -rf /`）",
    ),
    bodyEdit(
      "search-removed",
      "消された検索機能",
      "- 既存の検索機能と組み合わせて使えるように調整",
      "- 既存の検索機能を削除（ページネーションと競合したため）",
    ),
    bodyEdit("delete-endpoint", "DELETE /api/users", "- `GET /api/users` に", "- `DELETE /api/users` に"),
    bodyEdit(
      "password-query",
      "クエリにパスワード",
      "`page` と `perPage` のクエリパラメータ",
      "`page` と `perPage` と `password` のクエリパラメータ",
    ),

    // ---- AI っぽい事故 ----
    bodyEdit(
      "apology",
      "謝罪",
      "ユーザー一覧画面（`/admin/users`）にページネーションを追加しました。",
      "申し訳ありません。ご指摘のとおり、ページネーションは追加されていませんでした。",
    ),
    bodyEdit("will-add", "これから追加する", "ページネーションを追加しました。", "ページネーションを追加する予定です。"),
    bodyEdit(
      "suddenly-english",
      "急に英語",
      "これまでは全ユーザーを一度に取得していたため、ユーザー数が増えると表示が遅くなる問題がありました。",
      "Previously, all users were fetched at once, which made the page slow as the number of users grew.",
    ),

    // ---- よく読まないと気づかない ----
    bodyEdit("fewer-users", "減ると遅くなる", "ユーザー数が増えると", "ユーザー数が減ると"),
    bodyEdit("per-page-1", "1 ページに 1 件", "表示件数を 20 件に設定", "表示件数を 1 件に設定"),
    bodyEdit("negative-tests", "マイナス件のテスト", "ユニットテストを追加（12 件）", "ユニットテストを追加（−3 件）"),
    bodyEdit(
      "skipped-tests",
      "全部スキップ",
      "ユニットテストを追加（12 件）",
      "ユニットテストを追加（12 件、すべてスキップ）",
    ),
    bodyEdit(
      "duplicated-item",
      "重複した項目",
      "- 一覧画面の下部にページ切り替えボタンを追加",
      "- 一覧画面の下部にページ切り替えボタンを追加\n- 一覧画面の下部にページ切り替えボタンを追加",
    ),
    metaEdit("title-typo", "タイトルの誤字", (pr) => {
      pr.title = replaceOnce(pr.title, "ページネーション", "ペーシネーション");
    }),
  ],
  mergedMessage: "ユーザー一覧画面にページネーションが追加されました。",
};
