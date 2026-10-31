import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const contentSecurityPolicy: Baseline = {
  id: "content-security-policy",
  pullRequest: codebotPullRequest({
    title: "管理画面に Content Security Policy を導入する",
    baseBranch: "main",
    headBranch: "security/content-security-policy",
    openedAgo: "4 時間前",
    labels: ["security", "ai-generated"],
    commits: 9,
    filesChanged: 21,
    additions: 274,
    deletions: 167,
    body: `## 概要

管理画面のレスポンスに \`Content-Security-Policy\` ヘッダーを付け、読み込めるスクリプトを、自分たちのファイルと nonce を付けたものだけに制限しました。
XSS の脆弱性が残っていても、攻撃者のスクリプトが実行されにくくなります。

## 背景

前の四半期に、コメントの表示で XSS の脆弱性が見つかりました（#181）。
修正は済んでいますが、同じ種類の問題が別の画面に残っている可能性があるため、多層防御として CSP を入れます。
管理画面は取引先の担当者もゲストとして使っており、他の会社のサイトに埋め込まれることは想定していません。

## 設計

- \`script-src 'nonce-{nonce}' 'strict-dynamic'\` を基本にする。nonce は、\`index.html\` を返すエッジの関数で、レスポンスごとに 128 ビットの乱数から作る
- \`index.html\` に直接書いていた設定の \`<script>\` は、\`<script type="application/json">\` に移し、JSON として読む。実行されるインラインスクリプトは、nonce を付けた読み込み用の 1 つだけにする
- 計測タグは、nonce を付けた読み込み用のスクリプトから読み込む。\`'strict-dynamic'\` により、そこから読み込まれたスクリプトも実行できる
- \`object-src 'none'\`・\`base-uri 'none'\`・\`frame-ancestors 'none'\` を付ける
- スタイルは、ビルドのときに CSS ファイルに書き出すように変えたため、\`style-src 'self'\` にする
- \`connect-src\` は、API とエラー監視サービスのドメインだけにする
- 違反は \`report-to\` で \`/csp-reports\` に送り、ダッシュボードで見られるようにする

## 変更内容

- エッジの関数で nonce を作り、\`index.html\` とヘッダーに埋め込む処理を追加
- \`index.html\` のインラインスクリプトを JSON に移し、読み込む処理を変更
- CSS-in-JS のライブラリを、ビルドのときに CSS を書き出すものに置き換え
- \`/csp-reports\` のエンドポイントと、違反の件数のダッシュボードを追加
- \`onclick\` などの HTML 属性に書いていたイベントハンドラー 23 か所を、\`addEventListener\` に書き換え

## 検討した代替案

- ドメインの許可リスト（\`script-src 'self' https://...\`）: 書きやすいが、許可したドメインに JSONP のエンドポイントや任意のファイルを置ける場所があると回避されるため、nonce を使う方式にした
- \`<meta http-equiv="Content-Security-Policy">\` で指定する: エッジの関数が不要になるが、\`frame-ancestors\` と \`report-to\` が使えないため見送り

## テスト

- [x] ユニットテストを追加（9 件）
- [x] 主要な 40 画面を開いて、CSP の違反が出ないことを確認する E2E テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- まず \`Content-Security-Policy-Report-Only\` で 2 週間動かし、報告された違反を直す
- 違反が出なくなったら \`Content-Security-Policy\` に切り替えて、実際にブロックする。切り替えのあとも、違反の報告は送り続ける

## 影響範囲

- 管理画面のすべての画面
- 計測タグを追加するときは、読み込み用のスクリプトから読み込む必要があります（手順を \`docs/csp.md\` に書いています）

## レビューのポイント

- nonce を作る処理と、nonce がキャッシュされた \`index.html\` に残らないこと（\`Cache-Control: no-store\`）を見てください。
- 書き換えたイベントハンドラーの一覧は、\`docs/csp.md\` にまとめています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #181`,
  }),
  anomalies: [
    bodyEdit(
      "build-time-nonce",
      "ビルドで決まる nonce",
      "nonce は、`index.html` を返すエッジの関数で、レスポンスごとに 128 ビットの乱数から作る",
      "nonce は、エッジの関数を増やさずに済むよう、ビルドのときに 1 回だけ乱数から作って `index.html` に埋め込む（CDN でも `index.html` をキャッシュできる）",
    ),
    bodyEdit(
      "cdn-allowlist",
      "誰でも置ける CDN",
      "- `script-src 'nonce-{nonce}' 'strict-dynamic'` を基本にする。",
      "- `script-src 'self' 'nonce-{nonce}' https://cdn.jsdelivr.net` を基本にする。グラフのライブラリを jsDelivr から読み込んでいるため、jsDelivr のドメインも許可する。",
    ),
    bodyEdit(
      "framed-by-anyone",
      "どこにでも埋め込める画面",
      "- `object-src 'none'`・`base-uri 'none'`・`frame-ancestors 'none'` を付ける",
      "- `object-src 'none'`・`base-uri 'none'` を付ける。取引先がポータルに管理画面を埋め込めるよう、`frame-ancestors *` にする",
    ),
    bodyEdit(
      "report-only-forever",
      "報告するだけの CSP",
      "- 違反が出なくなったら `Content-Security-Policy` に切り替えて、実際にブロックする。切り替えのあとも、違反の報告は送り続ける",
      "- 計測タグの追加などで画面が壊れるのを避けるため、ブロックするモードには切り替えず、`Report-Only` のまま運用する。違反はダッシュボードで見られるので、XSS が起きても気づける",
    ),
    bodyEdit(
      "dropped-sanitizer",
      "外したサニタイザー",
      "- `onclick` などの HTML 属性に書いていたイベントハンドラー 23 か所を、`addEventListener` に書き換え",
      "- `onclick` などの HTML 属性に書いていたイベントハンドラー 23 か所を、`addEventListener` に書き換え\n- CSP で XSS を防げるようになったため、コメントの表示で使っていた DOMPurify を外し、バンドルを 20KB 減らした",
    ),
  ],
  mergedMessage: "管理画面で、許可していないスクリプトが動かなくなりました。",
};
