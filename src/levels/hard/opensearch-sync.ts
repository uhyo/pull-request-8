import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const openSearchSync: Baseline = {
  id: "opensearch-sync",
  pullRequest: codebotPullRequest({
    title: "取引先の全文検索を OpenSearch に移し、CDC で同期する",
    baseBranch: "main",
    headBranch: "feat/customers-opensearch",
    openedAgo: "6 時間前",
    labels: ["enhancement", "ai-generated"],
    commits: 12,
    filesChanged: 26,
    additions: 689,
    deletions: 112,
    body: `## 概要

取引先の検索を、PostgreSQL の \`LIKE '%...%'\` から OpenSearch の全文検索に移しました。
データは引き続き PostgreSQL を正とし、変更は Debezium による CDC（変更データキャプチャ）で OpenSearch に同期します。

## 背景

取引先が 1 テナントあたり最大 80 万件になり、部分一致の検索に 6 秒以上かかるようになりました（#172）。
また、「カブシキガイシャ」と「株式会社」、全角と半角の違いで検索に引っかからないという問い合わせも多く寄せられています。

## 設計

- PostgreSQL の \`customers\` テーブルを、引き続きデータの正とする。OpenSearch は検索のための複製で、消えても PostgreSQL から作り直せる
- Debezium で WAL から \`customers\` の変更を読み取り、Kafka を経由して OpenSearch に反映する。アプリケーションからは OpenSearch に書き込まない
- インデックスには kuromoji と ICU の正規化を設定し、読み仮名と全角・半角の違いを吸収する
- インデックスはエイリアス \`customers\` 経由で使い、マッピングを変えるときは新しいインデックスを作ってからエイリアスを切り替える（ダウンタイムなし）
- 検索のクエリには、必ずサーバー側で \`tenant_id\` のフィルターを付ける。検索結果の ID は PostgreSQL で権限を確認してから返す
- 本番のクラスタは 3 ノード・各シャードにレプリカ 1 にし、1 ノードが落ちても検索を続けられるようにする
- OpenSearch が応答しないときは、今までの \`LIKE\` の検索に戻す（遅いが、検索できなくなることはない）

## 変更内容

- Debezium のコネクタの設定と、Kafka から OpenSearch に書き込むシンクを追加
- \`customers\` のインデックスのテンプレート（kuromoji・ICU の設定を含む）を追加
- 検索 API を OpenSearch のクエリに置き換え、権限の確認とフォールバックを追加
- 全件を作り直すためのコマンド \`search:reindex customers\` を追加
- PostgreSQL と OpenSearch の件数の差を 1 時間ごとに確認し、ずれていたらアラートを出すジョブを追加

## 検討した代替案

- PostgreSQL の \`pg_trgm\` と GIN インデックス: 構成は増えないが、読み仮名の揺れを吸収できないため見送り
- アプリケーションから PostgreSQL と OpenSearch の両方に書き込む（二重書き込み）: 実装は簡単だが、片方だけ失敗したときにずれたままになるため、CDC にした

## テスト

- [x] ユニットテストを追加（31 件）
- [x] 取引先を更新してから 5 秒以内に検索結果に反映されることを確認する結合テストを追加
- [x] 他のテナントの取引先が検索結果に出ないことを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 本番で全件のインデックスを作ったあと、1 週間は両方の検索を実行し、結果の違いをログに記録する（画面には今までの結果を出す）
- 違いを確認してから、機能フラグ \`customers-opensearch\` で検索を切り替える

## 影響範囲

- 取引先の検索 API と、それを使う画面（取引先一覧・請求書の作成画面の取引先の選択）
- 取引先を更新してから検索に反映されるまで、通常 1〜2 秒かかります

## レビューのポイント

- 検索のクエリに \`tenant_id\` のフィルターが必ず付くこと（クエリを組み立てる \`buildCustomerQuery()\` の 1 か所でしか作れないようにしています）を見てください。
- OpenSearch の接続情報は、検索 API の Pod にだけ渡しています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #172`,
  }),
  anomalies: [
    bodyEdit(
      "search-as-source",
      "OpenSearch が正",
      "- PostgreSQL の `customers` テーブルを、引き続きデータの正とする。OpenSearch は検索のための複製で、消えても PostgreSQL から作り直せる",
      "- 同期のずれをなくすため、取引先のデータの正は OpenSearch に移し、PostgreSQL の `customers` テーブルは移行が終わったら削除する（請求書などからの参照は、OpenSearch のドキュメント ID で行う）",
    ),
    bodyEdit(
      "dual-write",
      "二重書き込み",
      "- Debezium で WAL から `customers` の変更を読み取り、Kafka を経由して OpenSearch に反映する。アプリケーションからは OpenSearch に書き込まない",
      "- Debezium や Kafka の運用を増やさないよう、取引先を保存するアプリケーションの処理で、PostgreSQL へのコミットのあとに OpenSearch にも書き込む。OpenSearch への書き込みが失敗した場合は、ログに残して処理を続ける",
    ),
    bodyEdit(
      "zero-replicas",
      "レプリカのないシャード",
      "- 本番のクラスタは 3 ノード・各シャードにレプリカ 1 にし、1 ノードが落ちても検索を続けられるようにする",
      "- 本番のクラスタは、コストを抑えるため 3 ノード・レプリカ 0 にする。OpenSearch は分散システムなので、1 ノードが落ちても、残りのノードで全件を検索できる",
    ),
    bodyEdit(
      "browser-to-opensearch",
      "ブラウザから直接検索",
      "- OpenSearch の接続情報は、検索 API の Pod にだけ渡しています。",
      "- 入力のたびに API を経由すると遅いため、画面から OpenSearch の `_search` エンドポイントに直接クエリを送っています。接続情報（読み書きのできるユーザー）は、画面の設定ファイルに入れています。",
    ),
    bodyEdit(
      "client-side-tenant",
      "画面で選り分けるテナント",
      "- 検索のクエリには、必ずサーバー側で `tenant_id` のフィルターを付ける。検索結果の ID は PostgreSQL で権限を確認してから返す",
      "- インデックスを全テナントで共有してクエリを単純にするため、`tenant_id` のフィルターはクエリには付けず、検索結果を受け取った画面の側で、自分のテナント以外の取引先を取り除く",
    ),
    bodyEdit(
      "no-alias",
      "止めて作り直すインデックス",
      "- インデックスはエイリアス `customers` 経由で使い、マッピングを変えるときは新しいインデックスを作ってからエイリアスを切り替える（ダウンタイムなし）",
      "- エイリアスは使わず、インデックス `customers` を直接使う。マッピングを変えるときは、インデックスを削除してから作り直す（全テナントの取引先の作り直しには約 6 時間かかり、その間の検索結果は空になる）",
    ),
  ],
  mergedMessage: "取引先を、表記の揺れがあってもすぐに検索できるようになりました。",
};
