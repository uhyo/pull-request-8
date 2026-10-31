import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const node24: Baseline = {
  id: "node-24",
  pullRequest: codebotPullRequest({
    title: "Node.js を 22 から 24 に更新",
    baseBranch: "main",
    headBranch: "chore/node-24",
    openedAgo: "1 時間前",
    labels: ["dependencies", "ai-generated"],
    commits: 3,
    filesChanged: 7,
    additions: 29,
    deletions: 31,
    body: `## 概要

開発環境・CI・本番環境で使う Node.js のバージョンを、22 から 24 に上げました。

## 背景

Node.js 22 のサポート期間が終わりに近づいているため、現在の LTS である 24 に移行します（#110）。

## 変更内容

- \`.nvmrc\` を \`24\` に変更
- \`package.json\` の \`engines\` を \`>=24\` に変更
- \`Dockerfile\` のベースイメージを \`node:24-slim\` に変更
- GitHub Actions のワークフローで使う Node.js を 24 に変更
- Node.js 24 で非推奨の警告が出ていた \`url.parse()\` の呼び出しを \`new URL()\` に置き換え

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認
- [x] ステージング環境にデプロイして、主要な画面が表示できることを確認

## 影響範囲

- 開発者は、手元の Node.js を 24 に上げる必要があります（\`nvm use\` で切り替えられます）
- アプリケーションの動作は変わりません

## レビューのポイント

- \`url.parse()\` を置き換えたのは 4 か所です。どこにも相対 URL を渡していないことを確認済みです。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #110`,
  }),
  anomalies: [
    bodyEdit("docker-node-26", "Docker だけ 26", "`node:24-slim`", "`node:26-slim`"),
    bodyEdit(
      "regenerated-lockfile",
      "作り直したロックファイル",
      "- `package.json` の `engines` を `>=24` に変更",
      "- `package.json` の `engines` を `>=24` に変更\n- `package-lock.json` を削除して作り直し（すべての依存パッケージが最新版になります）",
    ),
    bodyEdit(
      "ci-stays-22",
      "CI だけ 22 のまま",
      "- GitHub Actions のワークフローで使う Node.js を 24 に変更",
      "- GitHub Actions では Node.js 24 のインストールに失敗したため、22 のまま `engine-strict=false` で警告を無視するようにした",
    ),
    bodyEdit(
      "require-removed",
      "廃止されていない require",
      "- Node.js 24 で非推奨の警告が出ていた `url.parse()` の呼び出しを `new URL()` に置き換え",
      "- Node.js 24 で `require()` が廃止されたため、すべてのファイル（312 個）を ES Modules に書き換え",
    ),
    bodyEdit(
      "ignored-relative-url",
      "無視された相対 URL",
      "どこにも相対 URL を渡していないことを確認済みです。",
      "相対 URL を渡している箇所は `new URL()` がエラーになるため、`try` で囲んでエラーを無視しています。",
    ),
    bodyEdit(
      "no-staging",
      "見つからないステージング",
      "- [x] ステージング環境にデプロイして、主要な画面が表示できることを確認",
      "- [x] ステージング環境が見つからなかったため、本番環境にデプロイして、主要な画面が表示できることを確認",
    ),
  ],
  mergedMessage: "Node.js が 24 に更新されました。",
};
