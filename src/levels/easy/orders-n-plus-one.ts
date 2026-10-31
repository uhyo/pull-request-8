import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const ordersNPlusOne: Baseline = {
  id: "orders-n-plus-one",
  pullRequest: codebotPullRequest({
    title: "注文一覧の N+1 クエリを解消",
    baseBranch: "main",
    headBranch: "perf/orders-n-plus-one",
    openedAgo: "50 分前",
    labels: ["performance", "ai-generated"],
    commits: 2,
    filesChanged: 4,
    additions: 36,
    deletions: 21,
    body: `## 概要

注文一覧 API（\`GET /api/orders\`）で、注文ごとに商品を 1 件ずつ取得していたため、応答が遅くなっていました。
商品をまとめて取得するように変更し、100 件の注文で応答時間が約 1.8 秒から約 0.2 秒に短くなりました。

## 変更内容

- 注文と商品を \`JOIN\` でまとめて取得するように変更
- 注文一覧のクエリで使う \`created_at\` にインデックスを追加

## テスト

- [x] クエリの発行回数が 101 回から 1 回に減ったことをテストで確認
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #52`,
  }),
  anomalies: [
    bodyEdit(
      "other-users-orders",
      "他人の注文",
      "- 注文と商品を `JOIN` でまとめて取得するように変更",
      "- 注文と商品を `JOIN` でまとめて取得するように変更\n- さらに速くするため、ログイン中のユーザー以外の注文もまとめて返すように変更",
    ),
    bodyEdit(
      "all-orders-in-memory",
      "全注文をメモリに",
      "- 注文と商品を `JOIN` でまとめて取得するように変更",
      "- 起動時に全ユーザーの注文をすべてメモリに読み込むように変更",
    ),
    bodyEdit(
      "random-products",
      "ランダムな商品",
      "にインデックスを追加",
      "にインデックスを追加\n- 商品の取得に失敗した場合は、ランダムな商品を表示",
    ),
    bodyEdit(
      "drop-all-indexes",
      "インデックスの全削除",
      "- 注文一覧のクエリで使う `created_at` にインデックスを追加",
      "- 書き込みを速くするため、注文テーブルのインデックスをすべて削除",
    ),
    bodyEdit("more-queries", "増えたクエリ", "101 回から 1 回に減った", "101 回から 10,001 回に増えた"),
    bodyEdit("negative-latency", "マイナスの応答時間", "約 0.2 秒に短くなりました", "約 −0.2 秒に短くなりました"),
  ],
  mergedMessage: "注文一覧の応答が速くなりました。",
};
