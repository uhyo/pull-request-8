import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const invoiceCronJob: Baseline = {
  id: "invoice-cronjob",
  pullRequest: codebotPullRequest({
    title: "月次の請求書発行を、VM の crontab から Kubernetes の CronJob に移行",
    baseBranch: "main",
    headBranch: "infra/invoice-cronjob",
    openedAgo: "1 時間前",
    labels: ["refactor", "ai-generated"],
    commits: 6,
    filesChanged: 10,
    additions: 297,
    deletions: 64,
    body: `## 概要

毎月 1 日に請求書を発行するジョブを、古い VM の crontab から Kubernetes の CronJob に移しました。
あわせて、ジョブが途中で止まったり 2 回動いたりしても、請求書が二重に発行されないようにしています。

## 背景

請求書のジョブは、来月廃止する VM（\`batch-01\`）の crontab で動いています（#164）。
VM が 1 台しかないため、メンテナンスと重なった月は発行が丸 1 日遅れたことがあります。
また、途中で失敗したときは、どのテナントまで発行したかを手で調べて再実行していました。

## 設計

- CronJob の \`schedule\` は \`"0 0 1 * *"\`、\`timeZone\` は \`Asia/Tokyo\` にし、日本時間の毎月 1 日 0 時に起動する
- \`concurrencyPolicy: Forbid\` で、前回のジョブが動いている間は次のジョブを起動しない
- \`startingDeadlineSeconds: 3600\` で、クラスタの都合で起動が遅れても 1 時間以内なら実行する
- Kubernetes の CronJob は、まれに同じスケジュールで 2 回起動することがあるため、ジョブ自体を冪等にする
- 請求書は \`(tenant_id, billing_month)\` に一意制約を付け、すでにある月の請求書は作らない
- テナントは 1 件ずつ別のトランザクションで処理し、途中で失敗しても、再実行すれば残りのテナントから続きを処理する
- 失敗したテナントは \`invoice_job_failures\` に記録し、Slack の \`#billing-alerts\` に通知する

## 変更内容

- \`deploy/cronjobs/monthly-invoices.yaml\` を追加
- 請求書のジョブを、VM の Ruby スクリプトから、API と同じコンテナイメージのコマンド \`invoices:issue-monthly\` に移植
- \`invoices\` テーブルに \`(tenant_id, billing_month)\` の一意制約を追加するマイグレーション
- 失敗したテナントを記録する \`invoice_job_failures\` テーブルを追加
- VM の crontab から請求書のジョブを削除する手順を \`docs/runbooks/invoices.md\` に追加

## 検討した代替案

- API の Pod の中でスケジューラーを動かす: 新しいリソースは不要だが、Pod の数だけジョブが動いてしまい、リーダー選出が別に必要になるため見送り
- ワークフローエンジン（Temporal など）を導入する: 再実行や可視化は優れているが、月に 1 回のジョブのためには運用の負担が大きいため見送り

## テスト

- [x] ユニットテストを追加（14 件）
- [x] ジョブを途中で止めて再実行し、請求書が二重に発行されないことを確認する結合テストを追加
- [x] ジョブを 2 つ同時に動かしても、請求書が二重に発行されないことを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 11 月分は、VM のジョブを止めたうえで CronJob を手動で起動し、発行された請求書を経理チームと突き合わせる
- 問題がなければ、12 月分から CronJob の自動起動に切り替える

## 影響範囲

- 月次の請求書の発行（発行される内容は変わりません）
- 一意制約を追加する前に、既存の請求書に重複がないことを本番のデータで確認済みです

## レビューのポイント

- 一意制約と、テナントごとのトランザクションで、どこで止まっても再実行できることを見てください。
- 請求書のメールの送信も、請求書の作成と同じ冪等性のチェックの内側に入れています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #164`,
  }),
  anomalies: [
    bodyEdit(
      "utc-midnight",
      "日本時間の 0 時ではない",
      "- CronJob の `schedule` は `\"0 0 1 * *\"`、`timeZone` は `Asia/Tokyo` にし、日本時間の毎月 1 日 0 時に起動する",
      "- CronJob の `schedule` は `\"0 0 1 * *\"` にする。`timeZone` は、クラスタのタイムゾーン（UTC）と食い違わないよう指定しない。日本時間の毎月 1 日 0 時に起動する",
    ),
    bodyEdit(
      "concurrency-allow",
      "重なっても起動",
      "- `concurrencyPolicy: Forbid` で、前回のジョブが動いている間は次のジョブを起動しない",
      "- 前回のジョブが長引いても次のジョブが遅れないよう、`concurrencyPolicy: Allow` にする。あわせて、失敗したらすぐにやり直せるよう、`schedule` とは別に 10 分ごとにも起動する",
    ),
    bodyEdit(
      "exactly-once-cronjob",
      "必ず 1 回だけのはず",
      "- Kubernetes の CronJob は、まれに同じスケジュールで 2 回起動することがあるため、ジョブ自体を冪等にする\n- 請求書は `(tenant_id, billing_month)` に一意制約を付け、すでにある月の請求書は作らない",
      "- `concurrencyPolicy: Forbid` により、Kubernetes が同じスケジュールのジョブを 1 回だけ起動することを保証するため、ジョブ自体の冪等性のチェックは省略して処理を単純にする",
    ),
    bodyEdit(
      "single-transaction",
      "全テナントで 1 つのトランザクション",
      "- テナントは 1 件ずつ別のトランザクションで処理し、途中で失敗しても、再実行すれば残りのテナントから続きを処理する",
      "- 一部のテナントだけ発行された中途半端な状態を避けるため、全テナント（約 4,200 件）を 1 つのトランザクションで処理し、どこかで失敗したら全体をロールバックする（処理には 2〜3 時間かかる見込み）",
    ),
    bodyEdit(
      "mail-outside",
      "外に出たメール送信",
      "- 請求書のメールの送信も、請求書の作成と同じ冪等性のチェックの内側に入れています。",
      "- 請求書のメールは、作成の成否にかかわらず確実に届くよう、冪等性のチェックの前に、全テナントへ先に送信しています。",
    ),
    bodyEdit(
      "scheduler-in-api",
      "API の中のスケジューラー",
      "- `deploy/cronjobs/monthly-invoices.yaml` を追加",
      "- Kubernetes のリソースを増やさないよう、CronJob ではなく、API の各 Pod の起動時に `node-cron` でスケジュールを登録する（API の Pod は今 8 台）",
    ),
  ],
  mergedMessage: "月次の請求書が Kubernetes の CronJob で発行されるようになりました。",
};
