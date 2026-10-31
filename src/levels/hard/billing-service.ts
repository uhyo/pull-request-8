import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const billingService: Baseline = {
  id: "billing-service",
  pullRequest: codebotPullRequest({
    title: "請求の機能を billing-service として切り出す（第 1 段階）",
    baseBranch: "main",
    headBranch: "arch/extract-billing-service",
    openedAgo: "1 日前",
    labels: ["refactor", "ai-generated"],
    commits: 14,
    filesChanged: 41,
    additions: 1288,
    deletions: 356,
    body: `## 概要

モノリスの中にあった請求の機能（料金プラン・請求書・支払い状況）を、独立したサービス \`billing-service\` として切り出す第 1 段階です。
今回は、請求書の読み取りだけを新しいサービスに移し、書き込みは次の段階で移します（Strangler Fig パターン）。

## 背景

請求の機能は経理チームの都合で月末にリリースを止めたいのに、モノリスなので他の機能のリリースまで止まっていました（#175）。
また、請求書の PDF の生成が重く、月初にはモノリス全体のレスポンスが遅くなっています。
請求のデータは、決済代行サービスとの照合のため、他の機能から直接変更されないことが求められています。

## 設計

- \`billing-service\` は専用のデータベース（\`billing\`）を持つ。モノリスは \`billing\` のテーブルを直接読み書きせず、必ず \`billing-service\` の API を通す
- 移行中のデータは、モノリスの \`invoices\` テーブルから CDC で \`billing\` に複製する。書き込みを移すまでは、モノリスの側が正
- モノリスから \`billing-service\` への呼び出しは、タイムアウト 2 秒・リトライ 1 回にし、サーキットブレーカーを入れる。\`billing-service\` が落ちても、請求書の画面以外は動き続ける
- 請求書の画面は、\`billing-service\` が応答しないときは「請求書を表示できません」と表示し、モノリスの古い処理には戻さない（データの正を 2 つにしないため）
- サービス間の認証は、サービスメッシュの mTLS と、呼び出し元のサービスごとに発行した OAuth のクライアントクレデンシャルで行う
- PDF の生成は \`billing-service\` の非同期のジョブで行い、モノリスの Pod では動かさない

## 変更内容

- \`services/billing\` に \`billing-service\` を追加（請求書の一覧・詳細・PDF の取得 API）
- \`billing\` データベースと、\`invoices\` を複製する CDC の設定を追加
- モノリスの請求書の画面を、\`billing-service\` の API を呼ぶように変更（機能フラグ \`billing-service-read\`）
- サーキットブレーカーとタイムアウトを設定した API クライアント \`BillingClient\` を追加
- \`billing-service\` 用の Deployment・Service・ダッシュボード・アラートを追加

## 検討した代替案

- モノリスのまま、請求のモジュールの境界を整理する: リリースを分けられないため、今回の目的を満たさない
- 一度に読み取りと書き込みの両方を移す: 移行の期間は短くなるが、問題が起きたときに戻せる範囲が大きくなりすぎるため、段階的に移すことにした

## テスト

- [x] \`billing-service\` のユニットテストを追加（47 件）
- [x] 同じ請求書を、モノリスと \`billing-service\` の両方から取得し、内容が一致することを確認する比較テストを追加
- [x] \`billing-service\` を止めた状態で、請求書の画面以外が動くことを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 機能フラグ \`billing-service-read\` で、社内のテナント → 10% → 100% の順に切り替える
- 切り替えている間は、1% のリクエストでモノリスと \`billing-service\` の両方から取得し、違いがあればログに記録する

## 影響範囲

- 請求書の一覧・詳細・PDF の画面
- 請求書の書き込み（作成・取り消し）は、今回はまだモノリスで行います

## レビューのポイント

- モノリスから \`billing\` データベースへの接続が、どこにもないことを見てください（接続情報は \`billing-service\` にしか渡していません）。
- サーキットブレーカーが開いたときに、請求書の画面がどう見えるかをスクリーンショットで添付しています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #175`,
  }),
  anomalies: [
    bodyEdit(
      "shared-database",
      "共有したままのデータベース",
      "- `billing-service` は専用のデータベース（`billing`）を持つ。モノリスは `billing` のテーブルを直接読み書きせず、必ず `billing-service` の API を通す\n- 移行中のデータは、モノリスの `invoices` テーブルから CDC で `billing` に複製する。書き込みを移すまでは、モノリスの側が正",
      "- 移行を簡単にするため、`billing-service` はモノリスと同じデータベースに接続し、`invoices` などのテーブルを直接読み書きする。モノリスの他の機能も、今までどおりこれらのテーブルを直接参照・更新してよい",
    ),
    bodyEdit(
      "sync-chain",
      "同期呼び出しの連鎖",
      "- モノリスから `billing-service` への呼び出しは、タイムアウト 2 秒・リトライ 1 回にし、サーキットブレーカーを入れる。`billing-service` が落ちても、請求書の画面以外は動き続ける",
      "- 常に最新の請求の状態を表示できるよう、モノリスのすべての画面の表示（ヘッダーの「未払いの請求書」バッジのため）で `billing-service` を同期的に呼び出す。タイムアウトは設定せず、`billing-service` が応答するまで待つ",
    ),
    bodyEdit(
      "fallback-to-monolith",
      "2 つの正",
      "- 請求書の画面は、`billing-service` が応答しないときは「請求書を表示できません」と表示し、モノリスの古い処理には戻さない（データの正を 2 つにしないため）",
      "- 請求書の画面は、`billing-service` が応答しないときはモノリスの古い処理に戻し、請求書の作成や取り消しもモノリス側で受け付ける。あとで `billing-service` が復旧したら、双方の変更を突き合わせて手でマージする",
    ),
    bodyEdit(
      "distributed-transaction",
      "サービスをまたぐ XA トランザクション",
      "- PDF の生成は `billing-service` の非同期のジョブで行い、モノリスの Pod では動かさない",
      "- PDF の生成は `billing-service` の非同期のジョブで行い、モノリスの Pod では動かさない\n- 次の段階で書き込みを移すときに整合性を保てるよう、モノリスと `billing-service` のデータベースを XA（2 フェーズコミット）でまとめるトランザクションマネージャーを、今回から両方のサービスに組み込む",
    ),
    bodyEdit(
      "shared-admin-credential",
      "全員で使う管理者の鍵",
      "- サービス間の認証は、サービスメッシュの mTLS と、呼び出し元のサービスごとに発行した OAuth のクライアントクレデンシャルで行う",
      "- サービス間の認証は、クライアントの設定を共通にするため、すべてのサービスで同じ管理者用の API キー（`BILLING_ADMIN_KEY`）を使う。社内のネットワークからしか届かないので、mTLS は不要",
    ),
    bodyEdit(
      "big-bang-migration",
      "読み書きを一度に",
      "今回は、請求書の読み取りだけを新しいサービスに移し、書き込みは次の段階で移します（Strangler Fig パターン）。",
      "Strangler Fig パターンに従い、今回のリリースで請求書の読み取りと書き込みを一度に新しいサービスへ移し、モノリスの請求の処理は削除します。",
    ),
  ],
  mergedMessage: "請求書の読み取りが、新しい billing-service から行われるようになりました。",
};
