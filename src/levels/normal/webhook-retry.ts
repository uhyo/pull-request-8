import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const webhookRetry: Baseline = {
  id: "webhook-retry",
  pullRequest: codebotPullRequest({
    title: "Webhook の送信に失敗したときに再送する",
    baseBranch: "main",
    headBranch: "feat/webhook-retry",
    openedAgo: "50 分前",
    labels: ["enhancement", "ai-generated"],
    commits: 4,
    filesChanged: 9,
    additions: 231,
    deletions: 18,
    body: `## 概要

取引先のシステムへの Webhook の送信に失敗したとき、時間をおいて自動で再送するようにしました。

## 背景

取引先のサーバーが一時的に止まっていると、Webhook が届かないまま失われていました。
そのたびにサポートチームが手作業で再送しており、送り忘れも起きていました（#134）。

## 変更内容

- 送信に失敗した Webhook をキューに入れ、1 分後・5 分後・30 分後・2 時間後・6 時間後の最大 5 回再送
- 再送するのは、タイムアウトと 5xx エラーのときだけ（4xx エラーは再送しない）
- すべての再送に失敗したら、「Webhook の履歴」画面に失敗として表示し、担当者にメールで通知
- 各 Webhook に一意の ID（\`Webhook-Id\` ヘッダー）を付け、同じ Webhook が 2 回届いても取引先で見分けられるようにした
- 「Webhook の履歴」画面に、手動で再送するボタンを追加

## テスト

- [x] ユニットテストを追加（16 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 影響範囲

- Webhook を送信する処理と、「Webhook の履歴」画面
- 取引先から見ると、ヘッダーが 1 つ増えるだけです

## レビューのポイント

- 再送の間隔は、取引先のサーバーが復旧するまでの時間を考えて、だんだん長くなるようにしています。
- キューには既存のジョブキューを使っており、新しいサービスは増やしていません。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #134`,
  }),
  anomalies: [
    bodyEdit(
      "endless-retry",
      "終わらない再送",
      "の最大 5 回再送",
      "の 5 回再送し、それでも失敗したら、成功するまで 1 分ごとに再送",
    ),
    bodyEdit(
      "retry-on-success",
      "成功しても再送",
      "- 再送するのは、タイムアウトと 5xx エラーのときだけ（4xx エラーは再送しない）",
      "- 届いたかどうか不安なため、送信に成功した Webhook も念のため同じ間隔で再送",
    ),
    bodyEdit(
      "new-id-each-time",
      "毎回変わる ID",
      "- 各 Webhook に一意の ID（`Webhook-Id` ヘッダー）を付け、",
      "- 再送のたびに新しい ID（`Webhook-Id` ヘッダー）を付け、",
    ),
    bodyEdit(
      "new-paid-service",
      "増えた有料サービス",
      "キューには既存のジョブキューを使っており、新しいサービスは増やしていません。",
      "キューには、新しく契約したメッセージキューのサービス（月額 48 万円）を使っています。",
    ),
    bodyEdit(
      "shrinking-intervals",
      "だんだん短くなる間隔",
      "1 分後・5 分後・30 分後・2 時間後・6 時間後",
      "6 時間後・2 時間後・30 分後・5 分後・1 分後",
    ),
    bodyEdit(
      "secret-in-header",
      "ヘッダーに秘密鍵",
      "- 「Webhook の履歴」画面に、手動で再送するボタンを追加",
      "- 「Webhook の履歴」画面に、手動で再送するボタンを追加\n- 取引先で署名を検証できるように、署名に使う秘密鍵を `Webhook-Secret` ヘッダーに入れて送信",
    ),
  ],
  mergedMessage: "Webhook の送信に失敗したときに、自動で再送するようになりました。",
};
