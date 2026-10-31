import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const frontendErrorReporting: Baseline = {
  id: "frontend-error-reporting",
  pullRequest: codebotPullRequest({
    title: "画面で起きたエラーをエラー監視サービスに送る",
    baseBranch: "main",
    headBranch: "feat/frontend-error-reporting",
    openedAgo: "45 分前",
    labels: ["enhancement", "ai-generated"],
    commits: 3,
    filesChanged: 6,
    additions: 118,
    deletions: 3,
    body: `## 概要

管理画面のブラウザ側で起きた JavaScript のエラーを、サーバー側ですでに使っているエラー監視サービスに送るようにしました。

## 背景

「ボタンを押しても何も起きない」という問い合わせがあっても、ブラウザ側のエラーは記録されていないため、原因の調査に時間がかかっていました（#145）。

## 変更内容

- エラー監視サービスの公式 SDK を追加し、画面の読み込み時に初期化
- 捕捉されなかったエラーと、処理されなかった Promise の拒否を自動で送信
- エラーと一緒に、ログイン中のユーザーの ID と、開いていた画面の URL を送信
- 送信する前に、URL のクエリパラメータに含まれるメールアドレスやトークンを伏せ字にする
- 同じエラーが続けて起きた場合は、1 分に 1 回だけ送信

## テスト

- [x] ユニットテストを追加（6 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 影響範囲

- 管理画面のすべてのページ（SDK の読み込みで、ページのサイズが約 30 KB 増えます）
- 開発環境ではエラーを送信しません

## レビューのポイント

- 送信先の DSN は、サーバー側と同じく環境変数から読み込んでいます。
- 伏せ字にする項目は \`maskSensitive()\` にまとめています。足りない項目があれば教えてください。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #145`,
  }),
  anomalies: [
    bodyEdit(
      "hardcoded-keys",
      "直書きの鍵",
      "送信先の DSN は、サーバー側と同じく環境変数から読み込んでいます。",
      "環境変数がうまく読み込めなかったため、送信先の DSN と管理用の API キーをソースコードに直接書いています。",
    ),
    bodyEdit(
      "send-form-inputs",
      "入力内容まで送信",
      "- エラーと一緒に、ログイン中のユーザーの ID と、開いていた画面の URL を送信",
      "- 調査しやすいように、エラーと一緒に、画面に入力されていた内容（パスワード欄を含む）をすべて送信",
    ),
    bodyEdit(
      "unused-mask",
      "呼ばれない伏せ字",
      "- 送信する前に、URL のクエリパラメータに含まれるメールアドレスやトークンを伏せ字にする",
      "- URL を伏せ字にする関数 `maskSensitive()` を用意（まだどこからも呼んでいない）",
    ),
    bodyEdit(
      "dev-only",
      "開発環境だけで送信",
      "- 開発環境ではエラーを送信しません",
      "- 本番環境ではエラーを送信しません（開発環境だけで送信します）",
    ),
    bodyEdit(
      "unofficial-sdk",
      "名前の似たパッケージ",
      "- エラー監視サービスの公式 SDK を追加し、",
      "- エラー監視サービスの公式 SDK が見つからなかったため、名前の似た非公式のパッケージ（`errror-monitor-sdk`）を追加し、",
    ),
    bodyEdit(
      "auto-fix",
      "codebot が自動で修正",
      "- 同じエラーが続けて起きた場合は、1 分に 1 回だけ送信",
      "- 同じエラーが続けて起きた場合は、1 分に 1 回だけ送信\n- 送られてきたエラーは codebot が自動で修正し、レビューなしで本番に反映",
    ),
  ],
  mergedMessage: "画面で起きたエラーが、エラー監視サービスに送られるようになりました。",
};
