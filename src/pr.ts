export type CheckStatus = "success" | "failure" | "skipped";

export interface Check {
  name: string;
  status: CheckStatus;
}

export interface PullRequest {
  title: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  openedAgo: string;
  labels: string[];
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  checks: Check[];
  /** 説明文の下に並ぶタイムラインのイベント */
  timeline: string[];
  /** リポジトリに掲示されている「ご案内」 */
  notice: string[];
  /** プルリクエストの説明文（Markdown） */
  body: string;
}

/**
 * 毎回提示される「いつもの」プルリクエスト。
 * プレイヤーはこれを覚え、ここから外れたもの（異変）を見つける。
 */
export const basePullRequest: PullRequest = {
  title: "ユーザー一覧画面にページネーションを追加",
  author: "codebot[bot]",
  baseBranch: "main",
  headBranch: "feat/users-pagination",
  openedAgo: "3 分前",
  labels: ["enhancement", "ai-generated"],
  commits: 3,
  filesChanged: 7,
  additions: 184,
  deletions: 12,
  checks: [
    { name: "lint", status: "success" },
    { name: "test", status: "success" },
    { name: "build", status: "success" },
  ],
  timeline: ["codebot[bot] が あなた にレビューをリクエストしました"],
  notice: [
    "異変を見逃さないこと",
    "異変を見つけたら、すぐに変更をリクエストすること",
    "異変が見つからなかったら、承認すること",
    "プルリクエスト #8 で終わりにすること",
  ],
  body: `## 概要

ユーザー一覧画面（\`/admin/users\`）にページネーションを追加しました。
これまでは全ユーザーを一度に取得していたため、ユーザー数が増えると表示が遅くなる問題がありました。

## 変更内容

- \`GET /api/users\` に \`page\` と \`perPage\` のクエリパラメータを追加
- 1 ページあたりの表示件数を 20 件に設定
- 一覧画面の下部にページ切り替えボタンを追加
- 既存の検索機能と組み合わせて使えるように調整

## テスト

- [x] ユニットテストを追加（12 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #42`,
};

export function clonePullRequest(pr: PullRequest): PullRequest {
  return structuredClone(pr);
}
