import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const orderEventsOutbox: Baseline = {
  id: "order-events-outbox",
  pullRequest: codebotPullRequest({
    title: "注文イベントの送信に Transactional Outbox パターンを導入",
    baseBranch: "main",
    headBranch: "feat/order-events-outbox",
    openedAgo: "2 時間前",
    labels: ["enhancement", "ai-generated"],
    commits: 9,
    filesChanged: 21,
    additions: 642,
    deletions: 88,
    body: `## 概要

注文が確定したときの \`order.confirmed\` などのイベントを、Transactional Outbox パターンで Kafka に送るようにしました。
注文の更新とイベントの記録を同じトランザクションで行い、イベントが失われたり、存在しない注文のイベントが送られたりしないようにします。

## 背景

今は、注文をコミットしたあとに、アプリケーションから直接 Kafka に publish しています。
コミットと publish の間でプロセスが落ちるとイベントが失われ、出荷サービスに注文が届かないことがありました（#155）。
逆に、publish のあとでトランザクションがロールバックされ、存在しない注文の出荷指示が出たこともあります。

## 設計

- 注文を更新するトランザクションの中で、同じデータベースの \`outbox\` テーブルにイベントを \`INSERT\` する
- 別プロセスのリレー（\`outbox-relay\`）が \`outbox\` を 200ms ごとにポーリングし、未送信のイベントを Kafka に publish する
- リレーは \`SELECT ... FOR UPDATE SKIP LOCKED\` で行を取り出すので、複数台で動かしても同じイベントを同時に扱わない
- Kafka から ack が返ってから、その行に \`published_at\` を記録する
- そのため配信は at-least-once になる。消費側は \`event_id\` で重複を除く
- Kafka のパーティションキーは \`order_id\` にし、同じ注文のイベントの順序（作成 → 確定 → キャンセル）を保つ

## 変更内容

- \`outbox\` テーブルを作成するマイグレーション
- 注文を更新する 6 つのユースケースで、Kafka への直接の publish を \`outbox\` への \`INSERT\` に置き換え
- \`outbox-relay\` を追加（Deployment は 2 レプリカ）
- 出荷サービスと通知サービスの消費側に、\`processed_events\` テーブルを使った重複排除を追加
- 送信済みのイベントを 7 日後に削除するジョブを追加

## 検討した代替案

- Debezium による CDC: ポーリングより遅延は小さいが、Kafka Connect の運用が新たに必要になるため、今回は見送り。イベントの量が増えたら再検討する
- Kafka のトランザクション（exactly-once）: Kafka の中では有効だが、PostgreSQL のトランザクションとはまとめられないため、今回の問題は解決しない

## テスト

- [x] ユニットテストを追加（24 件）
- [x] コミットの直後にリレーを強制終了しても、再起動後にイベントが送られることを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 先に消費側の重複排除をデプロイし、そのあとで送信側を切り替える
- 送信側は機能フラグ \`order-events-outbox\` で切り替え、テナントの 10% → 50% → 100% の順に広げる

## 影響範囲

- 注文を更新する処理と、\`order.*\` イベントを消費する出荷サービス・通知サービス
- イベントが届くまでの時間が、最大で 200ms ほど長くなります

## レビューのポイント

- \`outbox\` への \`INSERT\` が、すべてのユースケースで注文の更新と同じトランザクションに入っているかを見てください。
- 消費側の重複排除も、業務の処理と同じトランザクションで \`processed_events\` に記録しています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #155`,
  }),
  anomalies: [
    bodyEdit(
      "outbox-elsewhere",
      "別のデータベースの outbox",
      "- 注文を更新するトランザクションの中で、同じデータベースの `outbox` テーブルにイベントを `INSERT` する",
      "- 注文のデータベースの負荷を増やさないよう、`outbox` テーブルはイベント専用に新しく用意した別の PostgreSQL クラスタに置き、注文のトランザクションをコミットしたあとで `INSERT` する",
    ),
    bodyEdit(
      "random-partition",
      "ばらばらのパーティション",
      "- Kafka のパーティションキーは `order_id` にし、同じ注文のイベントの順序（作成 → 確定 → キャンセル）を保つ",
      "- 特定のパーティションにイベントが偏らないよう、パーティションキーは指定せず、ラウンドロビンで全 24 パーティションに均等に振り分ける（スループットは約 3 倍になった）",
    ),
    bodyEdit(
      "mark-before-publish",
      "送る前に送信済み",
      "- Kafka から ack が返ってから、その行に `published_at` を記録する\n- そのため配信は at-least-once になる。消費側は `event_id` で重複を除く",
      "- 同じイベントが 2 回送られないよう、Kafka に publish する前に、その行に `published_at` を記録してコミットする\n- そのため配信は at-most-once になり、消費側での重複排除は不要になる",
    ),
    bodyEdit(
      "exactly-once-claim",
      "端から端まで exactly-once",
      "- そのため配信は at-least-once になる。消費側は `event_id` で重複を除く",
      "- さらに Kafka のプロデューサーで `enable.idempotence=true` を有効にしたので、データベースから消費側まで exactly-once が保証される。消費側での重複排除は不要",
    ),
    bodyEdit(
      "auto-commit-consumer",
      "先に進むオフセット",
      "- 消費側の重複排除も、業務の処理と同じトランザクションで `processed_events` に記録しています。",
      "- 消費側は、処理を速くするため `enable.auto.commit=true`（5 秒ごとにオフセットを自動コミット）にし、業務の処理は別スレッドのキューに渡してから非同期で行っています。",
    ),
    bodyEdit(
      "relay-in-api",
      "全 Pod のリレー",
      "- `outbox-relay` を追加（Deployment は 2 レプリカ）",
      "- リレーのための Deployment を増やさないよう、API の各 Pod（30 台）の中でリレーを動かす。行のロックは取らず、先に publish した Pod が `published_at` を書く",
    ),
  ],
  mergedMessage: "注文のイベントが失われたり、存在しない注文のイベントが送られたりしなくなりました。",
};
