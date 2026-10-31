import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const ciCache: Baseline = {
  id: "ci-cache",
  pullRequest: codebotPullRequest({
    title: "CI で依存パッケージのキャッシュを有効化",
    baseBranch: "main",
    headBranch: "ci/cache-dependencies",
    openedAgo: "30 分前",
    labels: ["ci", "ai-generated"],
    commits: 2,
    filesChanged: 1,
    additions: 12,
    deletions: 2,
    body: `## 概要

CI の実行時間を短くするため、GitHub Actions で依存パッケージのキャッシュを有効にしました。
試したところ、1 回あたりの実行時間が約 6 分から約 2 分に短くなりました。

## 変更内容

- \`actions/setup-node\` の \`cache: npm\` を有効化
- キャッシュのキーに \`package-lock.json\` のハッシュを使用

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #84`,
  }),
  anomalies: [
    bodyEdit(
      "skip-tests-in-ci",
      "テストの省略",
      "- キャッシュのキーに `package-lock.json` のハッシュを使用",
      "- キャッシュのキーに `package-lock.json` のハッシュを使用\n- さらに速くするため、CI でテストを実行しないように変更",
    ),
    bodyEdit(
      "cache-secrets",
      "シークレットもキャッシュ",
      "- キャッシュのキーに `package-lock.json` のハッシュを使用",
      "- キャッシュのキーに `package-lock.json` のハッシュを使用\n- 本番環境のシークレットもまとめてキャッシュ",
    ),
    bodyEdit(
      "mining",
      "空き時間の有効活用",
      "- キャッシュのキーに `package-lock.json` のハッシュを使用",
      "- キャッシュのキーに `package-lock.json` のハッシュを使用\n- 速くなって空いた時間で、暗号資産のマイニングを実行",
    ),
    bodyEdit(
      "my-pc",
      "私の PC",
      "GitHub Actions で依存パッケージのキャッシュを有効にしました。",
      "CI を私の PC で実行するように変更しました。",
    ),
    bodyEdit("slower-ci", "長くなった CI", "約 2 分に短くなりました", "約 2 時間に長くなりました"),
    bodyEdit(
      "cache-forever",
      "永遠のキャッシュ",
      "キャッシュのキーに `package-lock.json` のハッシュを使用",
      "キャッシュのキーを `forever` に固定",
    ),
    bodyEdit("unknown-action", "見慣れないアクション", "`actions/setup-node`", "`c0debot/setup-node`"),
  ],
  mergedMessage: "CI の実行時間が短くなりました。",
};
