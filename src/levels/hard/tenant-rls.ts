import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const tenantRls: Baseline = {
  id: "tenant-rls",
  pullRequest: codebotPullRequest({
    title: "PostgreSQL の行レベルセキュリティでテナントのデータを分離",
    baseBranch: "main",
    headBranch: "security/tenant-rls",
    openedAgo: "5 時間前",
    labels: ["security", "ai-generated"],
    commits: 8,
    filesChanged: 33,
    additions: 512,
    deletions: 97,
    body: `## 概要

テナントごとのデータを持つ 28 個のテーブルで、PostgreSQL の行レベルセキュリティ（RLS）を有効にしました。
アプリケーションのクエリで \`WHERE tenant_id = ...\` を書き忘れても、他のテナントのデータは読み書きできなくなります。

## 背景

先月、検索 API の 1 つで \`tenant_id\` の条件が抜けており、他のテナントの取引先の名前が候補に表示される事故がありました（#166）。
クエリを 1 つずつ見直すだけでは、同じ漏れを今後も防げないため、データベースの側で防ぐことにしました。

## 設計

- 対象のテーブルで \`ENABLE ROW LEVEL SECURITY\` と \`FORCE ROW LEVEL SECURITY\` を設定する
- ポリシーは \`USING (tenant_id = current_setting('app.tenant_id')::uuid)\` と、同じ条件の \`WITH CHECK\` にし、読み取りと書き込みの両方を制限する
- \`app.tenant_id\` は、リクエストごとのトランザクションの最初に \`SET LOCAL\` で設定する。PgBouncer は transaction pooling で動いているため、トランザクションが終われば設定は消え、次に同じ接続を使うリクエストには残らない
- \`app.tenant_id\` は、検証したセッションから取り出す。リクエストのヘッダーやパラメータの値は使わない
- \`app.tenant_id\` が設定されていない場合、\`current_setting\` がエラーになり、クエリは失敗する（どのテナントの行も返さない）
- アプリケーションは、テーブルの所有者ではない \`app_user\` ロールで接続する。全テナントを扱う集計バッチは、\`BYPASSRLS\` を持つ別のロール \`batch_user\` を使う

## 変更内容

- 28 個のテーブルに RLS とポリシーを設定するマイグレーション
- \`app_user\` と \`batch_user\` のロールを作成し、接続の設定を分けた
- リクエストのトランザクションを開始する \`withTenantTransaction()\` を追加し、すべてのリポジトリをこの中で動くように変更
- 既存のクエリの \`WHERE tenant_id = ...\` は、二重の守りとしてそのまま残した

## 検討した代替案

- テナントごとにスキーマを分ける: 分離は強いが、テナントが 4,000 を超えておりマイグレーションの時間が現実的でないため見送り
- アプリケーションの ORM で条件を自動で付ける: 実装は簡単だが、生の SQL や ORM を通らないクエリで漏れるため、データベースで守る方式にした

## テスト

- [x] ユニットテストを追加（26 件）
- [x] 2 つのテナントのデータを用意し、28 個すべてのテーブルで、他のテナントの行が読めず、書き込めないことを確認する結合テストを追加
- [x] 同じ PgBouncer の接続を続けて使ったときに、前のリクエストのテナントが残らないことを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- まず本番でポリシーを \`app_user\` ではなく監視用のロールに付け、1 週間、ポリシーに違反するクエリがないかをログで確認する
- 違反がないことを確かめてから、\`app_user\` にポリシーを適用する

## 影響範囲

- テナントのデータを持つ 28 個のテーブルと、それを使うすべての API
- クエリの実行計画は変わらないことを、主要な 40 個のクエリで確認済みです

## レビューのポイント

- \`SET LOCAL\` を使っているので、トランザクションの外でクエリを実行するとエラーになります。トランザクションの外で動くクエリが残っていないかを見てください。
- \`batch_user\` の接続情報は、集計バッチの Pod にだけ渡しています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #166`,
  }),
  anomalies: [
    bodyEdit(
      "session-level-set",
      "接続に残るテナント",
      "- `app.tenant_id` は、リクエストごとのトランザクションの最初に `SET LOCAL` で設定する。PgBouncer は transaction pooling で動いているため、トランザクションが終われば設定は消え、次に同じ接続を使うリクエストには残らない",
      "- `app.tenant_id` は、リクエストの最初に `SET`（`LOCAL` なし）で設定する。`SET LOCAL` だとクエリのたびにトランザクションが必要になるため。PgBouncer は transaction pooling で動いており、接続はリクエストをまたいで使い回されるので、`SET` の回数も少なくて済む",
    ),
    bodyEdit(
      "owner-connection",
      "所有者のまま接続",
      "- アプリケーションは、テーブルの所有者ではない `app_user` ロールで接続する。全テナントを扱う集計バッチは、`BYPASSRLS` を持つ別のロール `batch_user` を使う",
      "- 接続の設定を増やさないよう、アプリケーションも集計バッチも、マイグレーションと同じ、テーブルの所有者のロール `app_owner` で接続する。所有者のロールでも、ポリシーは同じように効く",
    ),
    bodyEdit(
      "using-only",
      "読めないが書ける",
      "ポリシーは `USING (tenant_id = current_setting('app.tenant_id')::uuid)` と、同じ条件の `WITH CHECK` にし、読み取りと書き込みの両方を制限する",
      "ポリシーは `USING (tenant_id = current_setting('app.tenant_id')::uuid)` だけにする。読み取りが制限されれば、他のテナントの行は見えないので、書き込みの条件（`WITH CHECK`）は不要",
    ),
    bodyEdit(
      "missing-means-all",
      "未設定なら全テナント",
      "- `app.tenant_id` が設定されていない場合、`current_setting` がエラーになり、クエリは失敗する（どのテナントの行も返さない）",
      "- 既存の管理用スクリプトが動かなくならないよう、`app.tenant_id` が設定されていない場合は、ポリシーの条件を `current_setting('app.tenant_id', true) IS NULL OR tenant_id = ...` にして、すべての行を返す",
    ),
    bodyEdit(
      "tenant-from-header",
      "ヘッダーで選ぶテナント",
      "- `app.tenant_id` は、検証したセッションから取り出す。リクエストのヘッダーやパラメータの値は使わない",
      "- `app.tenant_id` は、複数のテナントに所属するユーザーが画面で切り替えられるよう、リクエストの `X-Tenant-Id` ヘッダーの値をそのまま使う（ヘッダーがない場合だけ、セッションのテナントを使う）",
    ),
    bodyEdit(
      "where-removed",
      "外した二重の守り",
      "- 既存のクエリの `WHERE tenant_id = ...` は、二重の守りとしてそのまま残した",
      "- RLS で守られるようになったため、既存のクエリの `WHERE tenant_id = ...` は不要になったものとしてすべて削除した（214 か所）",
    ),
  ],
  mergedMessage: "テナントのデータが、データベースの側でも分離されるようになりました。",
};
