import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const csvImport: Baseline = {
  id: "csv-import",
  pullRequest: codebotPullRequest({
    title: "CSV ファイルからユーザーを一括登録できるようにする",
    baseBranch: "main",
    headBranch: "feat/users-csv-import",
    openedAgo: "20 分前",
    labels: ["enhancement", "ai-generated"],
    commits: 5,
    filesChanged: 11,
    additions: 468,
    deletions: 9,
    body: `## 概要

ユーザー管理画面に、CSV ファイルからユーザーをまとめて登録する機能を追加しました。

## 背景

新しい取引先が増えるたびに、サポートチームが数十〜数百人分のユーザーを 1 人ずつ手で登録しており、時間がかかっていました（#88）。

## 変更内容

- ユーザー一覧画面に「CSV から登録」ボタンを追加
- CSV の列は「名前」「メールアドレス」「権限」の 3 つ（1 行目は見出し）
- 登録の前にプレビュー画面を表示し、エラーのある行を赤く表示
- エラーが 1 行でもある場合は、どの行も登録しない
- 1 回に登録できるのは 1,000 行まで
- 登録したユーザーには、パスワード設定用の招待メールを送信

## テスト

- [x] ユニットテストを追加（15 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 影響範囲

- ユーザー一覧画面にボタンが 1 つ増えます
- 既存のユーザー登録の API は変更していません

## レビューのポイント

- 文字コードは UTF-8 と Shift_JIS の両方に対応しています。Excel で保存した CSV も読み込めます。
- 権限の列に \`admin\` を指定できるのは、\`admin\` 権限を持つユーザーだけにしています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #88`,
  }),
  anomalies: [
    bodyEdit(
      "partial-import",
      "黙って飛ばされる行",
      "- エラーが 1 行でもある場合は、どの行も登録しない",
      "- エラーのある行は飛ばして、残りの行だけを登録（飛ばした行の数は表示しない）",
    ),
    bodyEdit(
      "real-invitations",
      "本物の招待メール",
      "- [x] ユニットテストを追加（15 件）",
      "- [x] 本番の顧客リスト（3,200 人分）を読み込んで動作確認（招待メールも送信済み）",
    ),
    bodyEdit(
      "anyone-admin",
      "誰でも管理者を登録",
      "権限の列に `admin` を指定できるのは、`admin` 権限を持つユーザーだけにしています。",
      "権限の列に `admin` と書けば、どのユーザーでも管理者を登録できます。",
    ),
    bodyEdit(
      "shared-password",
      "全員同じパスワード",
      "- 登録したユーザーには、パスワード設定用の招待メールを送信",
      "- 登録したユーザーには、仮のパスワード（全員共通で `Welcome123`）を書いた招待メールを送信",
    ),
    bodyEdit("column-count", "数が合わない列", "「権限」の 3 つ", "「権限」の 2 つ"),
    bodyEdit(
      "utf8-only",
      "文字化けしたまま登録",
      "文字コードは UTF-8 と Shift_JIS の両方に対応しています。",
      "文字コードは UTF-8 だけに対応しています。Shift_JIS のファイルは、文字化けしたまま登録されます。",
    ),
    bodyEdit(
      "overwrite-existing",
      "上書きされる既存のユーザー",
      "- 1 回に登録できるのは 1,000 行まで",
      "- 1 回に登録できるのは 1,000 行まで\n- すでに登録されているメールアドレスがあった場合は、そのユーザーを CSV の内容で上書き",
    ),
  ],
  mergedMessage: "CSV ファイルからユーザーを一括登録できるようになりました。",
};
