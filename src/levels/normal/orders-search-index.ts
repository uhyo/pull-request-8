import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const ordersSearchIndex: Baseline = {
  id: "orders-search-index",
  pullRequest: codebotPullRequest({
    title: "注文の検索が遅い問題をインデックスの追加で改善",
    baseBranch: "main",
    headBranch: "perf/orders-search-index",
    openedAgo: "30 分前",
    labels: ["performance", "ai-generated"],
    commits: 2,
    filesChanged: 3,
    additions: 41,
    deletions: 0,
    body: `## 概要

注文一覧画面で取引先と期間を指定して検索すると、10 秒以上かかっていた問題を改善しました。
\`orders\` テーブルにインデックスを 1 つ追加し、手元の環境では 0.2 秒ほどで結果が返るようになりました。

## 背景

注文の件数が 500 万件を超えたあたりから、検索が遅いという問い合わせが増えていました（#141）。
実行計画を確認したところ、検索のたびに \`orders\` テーブルを全件読み込んでいたことが原因でした。

## 変更内容

- \`orders\` テーブルに \`(customer_id, ordered_at)\` の複合インデックスを追加するマイグレーションを作成
- インデックスは \`CREATE INDEX CONCURRENTLY\` で作成し、作成中もテーブルへの書き込みを止めない
- 検索のクエリ自体は変更していない

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認
- [x] 本番と同じ件数（500 万件）のダミーデータを入れた環境で、検索にかかる時間を比較

## 影響範囲

- \`orders\` テーブル（インデックスが 1 つ増えるだけで、データは変わりません）
- 本番環境では、インデックスの作成に 10 分ほどかかる見込みです

## レビューのポイント

- インデックスが増えると注文の登録が少し遅くなりますが、計測した範囲では差はありませんでした。
- マイグレーションを元に戻す処理（インデックスの削除）も用意しています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #141`,
  }),
  anomalies: [
    bodyEdit(
      "index-every-column",
      "すべての列にインデックス",
      "- `orders` テーブルに `(customer_id, ordered_at)` の複合インデックスを追加するマイグレーションを作成",
      "- 念のため、`orders` テーブルのすべての列（34 列）にそれぞれインデックスを追加するマイグレーションを作成",
    ),
    bodyEdit(
      "already-migrated",
      "実行済みのマイグレーション",
      "- 検索のクエリ自体は変更していない",
      "- 検索のクエリ自体は変更していない\n- 動作を確かめるため、マイグレーションは本番のデータベースで実行済み",
    ),
    bodyEdit(
      "without-concurrently",
      "止まる注文の受け付け",
      "- インデックスは `CREATE INDEX CONCURRENTLY` で作成し、作成中もテーブルへの書き込みを止めない",
      "- `CONCURRENTLY` を付けるとエラーになったため外した（インデックスを作成している 10 分ほどは、注文を受け付けられません）",
    ),
    bodyEdit("wrong-columns", "関係ない列", "`(customer_id, ordered_at)`", "`(shipping_note, updated_at)`"),
    bodyEdit(
      "unmeasured",
      "測っていない速さ",
      "手元の環境では 0.2 秒ほどで結果が返るようになりました。",
      "理論上は 0.2 秒ほどで結果が返るはずです（実際には計測していません）。",
    ),
    bodyEdit(
      "drop-table-rollback",
      "テーブルごと戻す",
      "マイグレーションを元に戻す処理（インデックスの削除）も用意しています。",
      "マイグレーションを元に戻す処理では、インデックスごと `orders` テーブルを削除します。",
    ),
  ],
  mergedMessage: "注文の検索が速くなりました。",
};
