import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const permissionCache: Baseline = {
  id: "permission-cache",
  pullRequest: codebotPullRequest({
    title: "権限チェックの結果を Redis にキャッシュし、API の p99 を改善",
    baseBranch: "main",
    headBranch: "perf/permission-cache",
    openedAgo: "3 時間前",
    labels: ["performance", "ai-generated"],
    commits: 6,
    filesChanged: 12,
    additions: 318,
    deletions: 46,
    body: `## 概要

API のリクエストごとに行っていた権限の計算結果を Redis にキャッシュし、API 全体の p99 レイテンシを 180ms から 70ms に改善しました。
権限が変わったときは、そのユーザーのキャッシュをすぐに無効化します。

## 背景

権限は、ロール・グループ・リソースごとの共有設定を組み合わせて計算しており、1 回の計算で平均 9 回のクエリを発行しています。
管理画面の 1 画面で API を 10〜20 回呼ぶため、権限の計算がデータベースの負荷の 4 割を占めていました（#158）。
一方で、退職者や権限を外された人がすぐに操作できなくなることは、監査の要件になっています。

## 設計

- 計算した権限の一覧を、\`perm:{tenant_id}:{user_id}:{version}\` をキーにして Redis に保存する
- \`version\` はユーザーごとの権限のバージョンで、\`users.permission_version\` に持つ
- ロール・グループ・共有設定を変更するトランザクションの中で、影響するユーザーの \`permission_version\` を 1 つ上げる。古いキーは参照されなくなり、そのまま期限切れで消える
- 念のため、キャッシュの TTL は 5 分にする
- Redis に接続できないときは、キャッシュを使わずにデータベースで権限を計算する（遅くはなるが、判定は正しいまま）
- \`permission_version\` は、セッションの検証と同じクエリで取得するため、クエリは増えない

## 変更内容

- \`users\` テーブルに \`permission_version\` を追加するマイグレーション
- 権限を計算する \`resolvePermissions()\` の前に、キャッシュを読む層を追加
- ロール・グループ・共有設定を変更する 11 か所で、\`permission_version\` を上げる処理を追加
- キャッシュのヒット率を、メトリクス \`permission_cache_hit_ratio\` として出力

## 検討した代替案

- アプリケーションのメモリにキャッシュする: Redis より速いが、Pod が 6 台あり、無効化を全 Pod に確実に届ける仕組みが別に必要になるため見送り
- キーを削除して無効化する: 削除と、別のリクエストによる古い値の書き戻しが競合すると、古い権限が残りうるため、バージョンをキーに含める方式にした

## テスト

- [x] ユニットテストを追加（17 件）
- [x] 権限を外した直後のリクエストが 403 になることを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 機能フラグ \`permission-cache\` で切り替え、社内のテナントで 3 日間動かしてから全テナントで有効にする
- 有効にしたあとも 1 週間は、1% のリクエストでキャッシュとデータベースの両方で権限を計算し、結果が食い違ったらアラートを出す

## 影響範囲

- 権限をチェックするすべての API
- Redis のメモリ使用量が、約 600MB 増えます

## レビューのポイント

- \`permission_version\` を上げ忘れている変更の経路がないかを見てください（11 か所の一覧を \`docs/permission-cache.md\` にまとめています）。
- バージョンを上げる処理は、権限の変更と同じトランザクションに入れています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #158`,
  }),
  anomalies: [
    bodyEdit(
      "fail-open",
      "Redis が落ちたら全部許可",
      "- Redis に接続できないときは、キャッシュを使わずにデータベースで権限を計算する（遅くはなるが、判定は正しいまま）",
      "- Redis に接続できないときは、データベースに負荷が集中して全体が止まるのを防ぐため、可用性を優先して権限チェックを省略し、リクエストを通す（Redis の SLA は 99.99% なので、影響はごく短時間）",
    ),
    bodyEdit(
      "day-long-ttl",
      "1 日残る権限",
      "- `version` はユーザーごとの権限のバージョンで、`users.permission_version` に持つ\n- ロール・グループ・共有設定を変更するトランザクションの中で、影響するユーザーの `permission_version` を 1 つ上げる。古いキーは参照されなくなり、そのまま期限切れで消える\n- 念のため、キャッシュの TTL は 5 分にする",
      "- `version` は全体で 1 つの固定値（デプロイのたびに変わる）にし、権限を変更したときの無効化は行わない\n- 権限が変更されるのは 1 日に数回程度なので、キャッシュの TTL は 24 時間にしてヒット率を上げる（ステージングではヒット率 99.7%）",
    ),
    bodyEdit(
      "cdn-cached",
      "CDN に載った権限",
      "- 計算した権限の一覧を、`perm:{tenant_id}:{user_id}:{version}` をキーにして Redis に保存する",
      "- 計算した権限の一覧を、`perm:{tenant_id}:{user_id}:{version}` をキーにして Redis に保存する\n- さらに、画面が権限を問い合わせる `GET /v1/me/permissions` のレスポンスに `Cache-Control: public, max-age=300` を付け、CDN でもキャッシュする（オリジンへのリクエストが 8 割減る）",
    ),
    bodyEdit(
      "client-permissions",
      "自己申告の権限",
      "- `permission_version` は、セッションの検証と同じクエリで取得するため、クエリは増えない",
      "- さらに Redis への往復も減らすため、計算した権限の一覧をログイン時にブラウザの `localStorage` に保存し、以降のリクエストでは `X-Permissions` ヘッダーで送ってもらう。サーバーはこのヘッダーがあれば、それを使って判定する",
    ),
    bodyEdit(
      "no-tenant-key",
      "テナントを忘れたキー",
      "`perm:{tenant_id}:{user_id}:{version}`",
      "`perm:{user_id}:{version}`（`user_id` はテナントごとの連番）",
    ),
    bodyEdit(
      "version-outside-tx",
      "あとで上がるバージョン",
      "- バージョンを上げる処理は、権限の変更と同じトランザクションに入れています。",
      "- バージョンを上げる処理は、権限を変更する処理を遅くしないよう、コミットのあとでジョブキューに積み、数分以内に非同期で実行しています。",
    ),
  ],
  mergedMessage: "API のレスポンスが速くなりました。",
};
