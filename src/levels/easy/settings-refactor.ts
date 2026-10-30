import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "./common";

export const settingsRefactor: Baseline = {
  id: "settings-refactor",
  pullRequest: codebotPullRequest({
    title: "設定画面のコンポーネントをタブごとに分割",
    baseBranch: "main",
    headBranch: "refactor/split-settings-page",
    openedAgo: "1 時間前",
    labels: ["refactor", "ai-generated"],
    commits: 4,
    filesChanged: 9,
    additions: 412,
    deletions: 389,
    body: `## 概要

約 1,200 行あった設定画面のコンポーネント（\`SettingsPage.tsx\`）を、タブごとのファイルに分割しました。
見た目と動作は変わりません。

## 変更内容

- 「一般」「通知」「セキュリティ」の 3 つのタブをそれぞれ別のファイルに分割
- タブ間で共通のフォーム部品を \`components/settings/\` にまとめた
- 未使用の props を削除

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #71`,
  }),
  anomalies: [
    bodyEdit(
      "security-tab-removed",
      "消えたセキュリティタブ",
      "- 「一般」「通知」「セキュリティ」の 3 つのタブをそれぞれ別のファイルに分割",
      "- 「一般」「通知」の 2 つのタブをそれぞれ別のファイルに分割（「セキュリティ」タブは削除）",
    ),
    bodyEdit(
      "any-everywhere",
      "すべて any",
      "- 未使用の props を削除",
      "- 未使用の props を削除\n- 型エラーをなくすため、すべての型を `any` に変更",
    ),
    bodyEdit(
      "eslint-disable",
      "lint の無効化",
      "- 未使用の props を削除",
      "- 未使用の props を削除\n- lint のエラーを避けるため、全ファイルの先頭に `/* eslint-disable */` を追加",
    ),
    bodyEdit(
      "magenta-background",
      "ついでの背景色",
      "- 未使用の props を削除",
      "- 未使用の props を削除\n- ついでに設定画面の背景色を `#ff00ff` に変更",
    ),
    bodyEdit("probably", "たぶん", "見た目と動作は変わりません。", "見た目と動作は変わりません。たぶん。"),
    bodyEdit(
      "one-line-per-file",
      "1 行 1 ファイル",
      "- 「一般」「通知」「セキュリティ」の 3 つのタブをそれぞれ別のファイルに分割",
      "- 1,200 行を 1 行ずつ別のファイルに分割",
    ),
    bodyEdit("used-props", "使用中の props", "- 未使用の props を削除", "- 使用中の props を削除"),
  ],
  mergedMessage: "設定画面のコンポーネントがタブごとに分割されました。",
};
