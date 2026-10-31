import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const markdownComments: Baseline = {
  id: "markdown-comments",
  pullRequest: codebotPullRequest({
    title: "案件のコメントで Markdown を使えるようにする",
    baseBranch: "main",
    headBranch: "feat/markdown-comments",
    openedAgo: "2 時間前",
    labels: ["enhancement", "ai-generated"],
    commits: 8,
    filesChanged: 17,
    additions: 421,
    deletions: 63,
    body: `## 概要

案件のコメント欄で、Markdown（箇条書き・リンク・太字・コードなど）を使えるようにしました。
入力欄には「書く」と「プレビュー」のタブを付け、送る前に見た目を確認できます。

## 背景

コメントは今はただのテキストで、手順や確認事項を箇条書きにしたいという要望が多く寄せられていました（#190）。
コメントは同じテナントの全員が見るほか、案件に招待された取引先のゲストも見ます。
前の四半期には、コメントの表示で XSS の脆弱性が見つかっています（#181）。

## 設計

- コメントは今までどおり、入力された Markdown のまま保存する。HTML への変換は表示するときに行う
- 変換には \`markdown-it\` を \`html: false\` で使い、Markdown の中に書かれた HTML はタグとして扱わず、そのまま文字として表示する
- 変換した HTML は、表示する直前に DOMPurify で無害化してから画面に入れる。許可するタグと属性は、Markdown が出力するものだけにする
- リンクの URL は \`http:\`・\`https:\`・\`mailto:\` だけを許可し、\`target="_blank"\` と \`rel="noopener noreferrer"\` を付ける
- 画像は、このサービスにアップロードした添付ファイルだけを表示できるようにする。外部の URL の画像は、見た人の IP アドレスやコメントを開いた時刻が外部のサーバーに伝わるため、リンクとして表示する
- メールの通知でも、画面と同じ変換と無害化の設定（共通のパッケージ \`@acme/comment-renderer\`）を使う
- プレビューも同じ \`@acme/comment-renderer\` で表示し、保存したあとの見た目と一致させる

## 変更内容

- 共通のパッケージ \`@acme/comment-renderer\`（\`markdown-it\` と DOMPurify の設定）を追加
- コメントの表示を、テキストから \`@acme/comment-renderer\` で変換した HTML に変更
- 入力欄に「書く」と「プレビュー」のタブと、太字やリンクを入れるボタンを追加
- メールの通知のテンプレートを、\`@acme/comment-renderer\` を使うように変更

## 検討した代替案

- WYSIWYG のエディタ（入力した HTML をそのまま保存する）: 書きやすいが、保存する HTML を信用することになり、無害化の漏れがそのまま保存されてしまうため見送り
- 保存するときに HTML に変換して保存する: 表示のたびに変換しなくて済むが、無害化の設定を直したときに、過去のコメントに反映されないため見送り

## テスト

- [x] ユニットテストを追加（31 件。XSS のよく知られたペイロード 120 種類を含む）
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 機能フラグ \`markdown-comments\` で切り替え、社内のテナント → 全テナントの順に広げる
- フラグを切ると、同じコメントがテキストのまま表示される（保存している内容は同じため）

## 影響範囲

- 案件のコメントの表示と入力
- コメントのメール通知
- 今までのコメントに \`*\` や \`#\` が含まれていると、見た目が変わることがあります

## レビューのポイント

- DOMPurify で許可しているタグと属性の一覧（\`allowedTags.ts\`）を見てください。
- リンクの URL のスキームを確認する処理を見てください。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #190`,
  }),
  anomalies: [
    bodyEdit(
      "sanitize-before-save",
      "送る前だけの無害化",
      "- コメントは今までどおり、入力された Markdown のまま保存する。HTML への変換は表示するときに行う",
      "- 表示のたびに変換しなくて済むよう、送る前にブラウザで HTML に変換して無害化し、その HTML を保存する。表示するときは、保存した HTML をそのまま `innerHTML` に入れる",
    ),
    bodyEdit(
      "regex-sanitizer",
      "正規表現の無害化",
      "- 変換には `markdown-it` を `html: false` で使い、Markdown の中に書かれた HTML はタグとして扱わず、そのまま文字として表示する\n- 変換した HTML は、表示する直前に DOMPurify で無害化してから画面に入れる。許可するタグと属性は、Markdown が出力するものだけにする",
      "- 色や折りたたみ（`<details>`）も使えるよう、変換には `markdown-it` を `html: true` で使い、Markdown の中に書かれた HTML もそのまま出力する\n- バンドルを小さくするため DOMPurify は使わず、変換した HTML から `<script>` タグを正規表現で取り除いてから画面に入れる",
    ),
    bodyEdit(
      "any-scheme-links",
      "どこへでも行けるリンク",
      "- リンクの URL は `http:`・`https:`・`mailto:` だけを許可し、",
      "- 社内ツールの独自のスキーム（`acme-crm:` など）も開けるよう、リンクの URL のスキームは制限せず、",
    ),
    bodyEdit(
      "external-images",
      "外から読み込む画像",
      "- 画像は、このサービスにアップロードした添付ファイルだけを表示できるようにする。外部の URL の画像は、見た人の IP アドレスやコメントを開いた時刻が外部のサーバーに伝わるため、リンクとして表示する",
      "- 画像は、添付する手間を省くため、外部の URL もそのまま `<img>` として表示する",
    ),
    bodyEdit(
      "raw-email",
      "無害化しないメール",
      "- メールの通知でも、画面と同じ変換と無害化の設定（共通のパッケージ `@acme/comment-renderer`）を使う",
      "- メールの通知では、メールのクライアントは JavaScript を実行しないため、変換した HTML を無害化せずにそのまま本文に入れる",
    ),
  ],
  mergedMessage: "コメントで箇条書きやリンクが使えるようになりました。",
};
