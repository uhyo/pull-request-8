import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const presignedUploads: Baseline = {
  id: "presigned-uploads",
  pullRequest: codebotPullRequest({
    title: "添付ファイルを S3 の署名付き URL で直接アップロードする",
    baseBranch: "main",
    headBranch: "feat/presigned-uploads",
    openedAgo: "3 時間前",
    labels: ["enhancement", "ai-generated"],
    commits: 7,
    filesChanged: 19,
    additions: 455,
    deletions: 128,
    body: `## 概要

契約書などの添付ファイルを、API サーバーを経由せず、ブラウザから S3 に直接アップロードするようにしました。
API サーバーは、S3 の署名付き URL を発行するだけになります。

## 背景

今は添付ファイルを API サーバーが受け取ってから S3 に保存しているため、大きなファイル（最大 100MB）のアップロード中は、API の Pod のメモリと接続が埋まっていました（#168）。
添付ファイルには契約書や身分証明書の画像も含まれるため、他のテナントや外部から見えないことが前提です。

## 設計

- 画面がファイル名・サイズ・種類を API に送ると、API が S3 の署名付き URL（\`PUT\`、有効期限 5 分）を発行する
- オブジェクトのキーは API が \`tenants/{tenant_id}/attachments/{uuid}\` の形で決める。画面から送られたファイル名は、メタデータとして保存するだけで、キーには使わない
- 署名付き URL には \`Content-Length\` と \`Content-Type\` を含め、申告と異なるサイズや種類のファイルはアップロードできないようにする
- バケットは非公開のままにし、Block Public Access も有効にする
- アップロードが終わると、S3 のイベントでウイルススキャンの Lambda が動き、問題がなかったファイルだけを \`available\` にする。\`available\` になるまでは、ダウンロードできない
- ダウンロードのときは、権限を確認してから、有効期限 1 分の署名付き URL（\`GET\`）を発行してリダイレクトする

## 変更内容

- 署名付き URL を発行する \`POST /v1/attachments/upload-url\` と、アップロードの完了を伝える \`POST /v1/attachments/{id}/complete\` を追加
- 画面のアップロード処理を、署名付き URL への直接の \`PUT\` に変更し、進み具合のバーを追加
- ウイルススキャンの Lambda と、その結果で状態を更新する処理を追加
- 古いアップロード API（\`POST /v1/attachments\`）は、画面の移行が終わるまで残す
- S3 のバケットに CORS の設定を追加（許可するオリジンは管理画面のドメインだけ）

## 検討した代替案

- API サーバーでストリーミングしながら S3 に転送する: メモリは減るが、接続が埋まる問題は残るため見送り
- 署名付き POST（ポリシー付き）を使う: サイズの範囲を指定できる利点があるが、画面のアップロード処理が複雑になるため、\`PUT\` で \`Content-Length\` を固定する方式にした

## テスト

- [x] ユニットテストを追加（22 件）
- [x] 申告と異なるサイズのファイルや、期限切れの URL でのアップロードが拒否されることを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 機能フラグ \`direct-upload\` で切り替え、社内のテナントで 1 週間使ってから全テナントに広げる
- 古いアップロード API は、全テナントで切り替えて 2 週間たったら、別のプルリクエストで削除する

## 影響範囲

- 添付ファイルのアップロードとダウンロード
- API の Pod のメモリ使用量が、アップロードの多い時間帯で約 4 割減る見込みです

## レビューのポイント

- オブジェクトのキーに、画面から送られた値が入らないことを見てください。
- ダウンロードの権限の確認は、古い API と同じ \`canReadAttachment()\` を使っています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #168`,
  }),
  anomalies: [
    bodyEdit(
      "public-bucket",
      "公開されたバケット",
      "- バケットは非公開のままにし、Block Public Access も有効にする",
      "- ダウンロードのたびに署名付き URL を発行するとレイテンシが増えるため、バケットのポリシーで `s3:GetObject` を全員に許可し、Block Public Access は無効にする。キーには推測できない UUID が入るので、URL を知らない人はアクセスできない",
    ),
    bodyEdit(
      "client-chosen-key",
      "画面が決めるキー",
      "- オブジェクトのキーは API が `tenants/{tenant_id}/attachments/{uuid}` の形で決める。画面から送られたファイル名は、メタデータとして保存するだけで、キーには使わない",
      "- 同じ名前のファイルを上書きして更新できるよう、オブジェクトのキーは、画面から送られたパス（例: `tenants/{tenant_id}/contracts/契約書.pdf`）をそのまま使う",
    ),
    bodyEdit(
      "browser-credentials",
      "ブラウザに配った鍵",
      "- 画面がファイル名・サイズ・種類を API に送ると、API が S3 の署名付き URL（`PUT`、有効期限 5 分）を発行する",
      "- API への往復をなくすため、署名付き URL はブラウザで作る。そのために、S3 への書き込みと読み取りの権限を持つ IAM ユーザーのアクセスキーを、ログインしたユーザーに配布する",
    ),
    bodyEdit(
      "week-long-urls",
      "1 週間有効な URL",
      "- ダウンロードのときは、権限を確認してから、有効期限 1 分の署名付き URL（`GET`）を発行してリダイレクトする",
      "- ダウンロード用の URL は、メールやチャットで共有しても使えるよう、署名付き URL の上限の 7 日間有効にし、添付ファイルの一覧に表示しておく",
    ),
    bodyEdit(
      "scan-later",
      "あとで調べるウイルス",
      "問題がなかったファイルだけを `available` にする。`available` になるまでは、ダウンロードできない",
      "結果は 1 日 1 回まとめて記録する。アップロードを待たせないよう、ファイルはアップロードが終わった時点で `available` にし、すぐにダウンロードできるようにする",
    ),
    bodyEdit(
      "browser-only-limits",
      "画面だけのサイズ制限",
      "- 署名付き URL には `Content-Length` と `Content-Type` を含め、申告と異なるサイズや種類のファイルはアップロードできないようにする",
      "- ファイルのサイズ（最大 100MB）と種類の制限は、画面の JavaScript でアップロードの前に確認する。署名には含めないので、ファイルを選び直しても同じ URL のまま再試行できる",
    ),
  ],
  mergedMessage: "添付ファイルが S3 に直接アップロードされるようになりました。",
};
