import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const viewerRole: Baseline = {
  id: "viewer-role",
  pullRequest: codebotPullRequest({
    title: "閲覧専用の権限「viewer」を追加",
    baseBranch: "main",
    headBranch: "feat/viewer-role",
    openedAgo: "1 時間前",
    labels: ["enhancement", "ai-generated"],
    commits: 6,
    filesChanged: 18,
    additions: 387,
    deletions: 42,
    body: `## 概要

管理画面の内容を見ることはできるが、変更はできない「viewer」権限を追加しました。

## 背景

経理や監査の担当者にも管理画面を見てもらう必要がありますが、今は \`admin\` と \`editor\` の権限しかなく、どちらも内容を変更できてしまいます（#138）。

## 変更内容

- 権限に \`viewer\` を追加（権限は \`admin\`・\`editor\`・\`viewer\` の 3 つになります）
- \`viewer\` は、すべての一覧画面と詳細画面を見ることができる
- \`viewer\` には、作成・編集・削除のボタンを表示しない
- ボタンを隠すだけでなく、API 側でも \`viewer\` からの変更のリクエストを拒否（403 を返す）
- ユーザー編集画面の権限の選択肢に \`viewer\` を追加

## テスト

- [x] ユニットテストを追加（21 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 影響範囲

- 変更を行うすべての API に、権限のチェックを追加しています
- 既存の \`admin\` と \`editor\` のユーザーの動作は変わりません

## レビューのポイント

- API の権限チェックは、1 か所の共通処理（ミドルウェア）にまとめています。新しい API を追加したときも、自動でチェックされます。
- \`viewer\` でも、自分のパスワードの変更だけはできるようにしています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #138`,
  }),
  anomalies: [
    bodyEdit(
      "hidden-buttons-only",
      "隠しただけのボタン",
      "- ボタンを隠すだけでなく、API 側でも `viewer` からの変更のリクエストを拒否（403 を返す）",
      "- API 側の変更は大がかりになるため、ボタンを隠すだけにした",
    ),
    bodyEdit(
      "self-promotion",
      "自分で昇格",
      "`viewer` でも、自分のパスワードの変更だけはできるようにしています。",
      "`viewer` でも、自分の権限の変更だけはできるようにしています（`admin` にも変更できます）。",
    ),
    bodyEdit(
      "editors-demoted",
      "全員 viewer に",
      "- 既存の `admin` と `editor` のユーザーの動作は変わりません",
      "- 安全のため、既存の `editor` のユーザーはすべて `viewer` に変更します",
    ),
    bodyEdit("four-roles", "4 つの権限", "`viewer` の 3 つになります", "`viewer` の 4 つになります"),
    bodyEdit(
      "delete-unchecked",
      "DELETE は素通り",
      "新しい API を追加したときも、自動でチェックされます。",
      "ただし、ミドルウェアが対応していなかったため、DELETE のリクエストはチェックの対象外です。",
    ),
    bodyEdit(
      "tested-as-admin",
      "admin で試験",
      "- [x] ユニットテストを追加（21 件）",
      "- [x] ユニットテストを追加（21 件。`viewer` のユーザーをうまく作れなかったため、すべて `admin` で実行）",
    ),
  ],
  mergedMessage: "閲覧専用の権限「viewer」が追加されました。",
};
