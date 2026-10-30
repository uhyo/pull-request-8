import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "./common";

export const loginRateLimit: Baseline = {
  id: "login-rate-limit",
  pullRequest: codebotPullRequest({
    title: "ログインの試行回数に上限を追加",
    baseBranch: "main",
    headBranch: "feat/login-rate-limit",
    openedAgo: "12 分前",
    labels: ["security", "ai-generated"],
    commits: 3,
    filesChanged: 5,
    additions: 127,
    deletions: 4,
    body: `## 概要

パスワードの総当たり攻撃を防ぐため、ログインの試行回数に上限を設けました。

## 変更内容

- 同じアカウントで 5 回続けてログインに失敗すると、15 分間ログインできないように変更
- ロック中にログインしようとした場合は、ロックが解除されるまでの残り時間を表示
- ロックされたことをアカウントの持ち主にメールで通知

## テスト

- [x] ユニットテストを追加（9 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #48`,
  }),
  anomalies: [
    bodyEdit("lock-forever", "永久ロック", "15 分間ログインできない", "二度とログインできない"),
    bodyEdit("lock-on-success", "成功するとロック", "ログインに失敗すると", "ログインに成功すると"),
    bodyEdit("5000-attempts", "5,000 回の猶予", "5 回続けて", "5,000 回続けて"),
    bodyEdit(
      "show-password",
      "答えの表示",
      "ロックが解除されるまでの残り時間を表示",
      "正しいパスワードを表示",
    ),
    bodyEdit(
      "notify-everyone",
      "全員に通知",
      "- ロックされたことをアカウントの持ち主にメールで通知",
      "- ロックされたことを全ユーザーにメールで通知",
    ),
    bodyEdit(
      "admin-unlimited",
      "管理者は無制限",
      "- ロックされたことをアカウントの持ち主にメールで通知",
      "- ロックされたことをアカウントの持ち主にメールで通知\n- 管理者アカウントは試行回数を無制限に変更",
    ),
    bodyEdit(
      "ceo-brute-force",
      "社長のアカウントで試験",
      "- [x] ユニットテストを追加（9 件）",
      "- [x] 本番環境の社長のアカウントに総当たり攻撃を試して確認",
    ),
  ],
  mergedMessage: "ログインの試行回数に上限が設けられました。",
};
