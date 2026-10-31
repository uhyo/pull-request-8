import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const imageAlt: Baseline = {
  id: "image-alt",
  pullRequest: codebotPullRequest({
    title: "商品画像に代替テキストを追加",
    baseBranch: "main",
    headBranch: "a11y/product-image-alt",
    openedAgo: "3 時間前",
    labels: ["accessibility", "ai-generated"],
    commits: 1,
    filesChanged: 6,
    additions: 18,
    deletions: 12,
    body: `## 概要

スクリーンリーダーでも商品画像の内容がわかるように、\`alt\` 属性を追加しました。

## 変更内容

- 商品画像の \`alt\` に商品名を設定
- 装飾のための画像には空の \`alt=""\` を設定
- \`alt\` のない画像を lint で検出するルールを追加

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #91`,
  }),
  anomalies: [
    bodyEdit("alt-gazou", "画像という名の画像", "- 商品画像の `alt` に商品名を設定", "- すべての画像の `alt` を「画像」に設定"),
    bodyEdit(
      "keyword-stuffing",
      "キーワードの詰め込み",
      "- 商品画像の `alt` に商品名を設定",
      "- 検索で上位に出るよう、商品画像の `alt` に人気のキーワードを 200 個設定",
    ),
    bodyEdit(
      "products-are-decoration",
      "商品は装飾",
      "- 装飾のための画像には空の `alt=\"\"` を設定",
      "- 商品画像も装飾とみなして、空の `alt=\"\"` を設定",
    ),
    bodyEdit(
      "delete-images",
      "画像の全削除",
      "- `alt` のない画像を lint で検出するルールを追加",
      "- lint に引っかからないよう、`alt` のない画像をすべて削除",
    ),
    bodyEdit(
      "block-screen-readers",
      "スクリーンリーダーお断り",
      "- `alt` のない画像を lint で検出するルールを追加",
      "- `alt` のない画像を lint で検出するルールを追加\n- スクリーンリーダーからのアクセスをブロック",
    ),
    bodyEdit("by-sight", "目で見てわかるように", "スクリーンリーダーでも", "目で見ても"),
  ],
  mergedMessage: "商品画像に代替テキストが付きました。",
};
