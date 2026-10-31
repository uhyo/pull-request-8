import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const darkMode: Baseline = {
  id: "dark-mode",
  pullRequest: codebotPullRequest({
    title: "ダークモードに対応",
    baseBranch: "main",
    headBranch: "feat/dark-mode",
    openedAgo: "18 分前",
    labels: ["enhancement", "ai-generated"],
    commits: 5,
    filesChanged: 14,
    additions: 236,
    deletions: 58,
    body: `## 概要

OS の設定に合わせて、画面をダークモードで表示できるようにしました。

## 変更内容

- 色の指定を CSS 変数にまとめ、ライト用とダーク用の 2 種類を用意
- \`prefers-color-scheme\` で OS の設定を読み取って切り替え
- ヘッダーに、手動で切り替えるためのボタンを追加

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #66`,
  }),
  anomalies: [
    bodyEdit(
      "dark-only",
      "ダークモード専用",
      "ライト用とダーク用の 2 種類を用意",
      "ダーク用の 1 種類だけを用意（ライトモードは廃止）",
    ),
    bodyEdit(
      "dark-at-noon",
      "昼はダーク",
      "- `prefers-color-scheme` で OS の設定を読み取って切り替え",
      "- OS の設定に関係なく、昼はダーク、夜はライトに切り替え",
    ),
    bodyEdit(
      "black-on-black",
      "黒地に黒い文字",
      "- ヘッダーに、手動で切り替えるためのボタンを追加",
      "- ヘッダーに、手動で切り替えるためのボタンを追加\n- ダークモードでも文字の色は黒のまま",
    ),
    bodyEdit(
      "paid-toggle",
      "有料の切り替え",
      "- ヘッダーに、手動で切り替えるためのボタンを追加",
      "- ヘッダーに、手動で切り替えるためのボタンを追加（押すたびに 1,000 円かかります）",
    ),
    bodyEdit(
      "invert-everything",
      "色の反転",
      "- 色の指定を CSS 変数にまとめ、ライト用とダーク用の 2 種類を用意",
      "- 画面全体に `filter: invert(1)` をかけて、画像や動画も含めてすべての色を反転",
    ),
    bodyEdit("light-mode", "ライトモードに対応", "画面をダークモードで表示", "画面をライトモードで表示"),
  ],
  mergedMessage: "画面がダークモードに対応しました。",
};
