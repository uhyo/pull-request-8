import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const flakyDateTest: Baseline = {
  id: "flaky-date-test",
  pullRequest: codebotPullRequest({
    title: "ときどき失敗する日付のテストを修正",
    baseBranch: "main",
    headBranch: "fix/flaky-date-test",
    openedAgo: "5 分前",
    labels: ["test", "ai-generated"],
    commits: 1,
    filesChanged: 2,
    additions: 14,
    deletions: 6,
    body: `## 概要

CI でときどき失敗していた \`formatDeadline\` のテストを修正しました。
日付が変わる直前に実行されると、期待する日付が 1 日ずれていたことが原因です。

## 変更内容

- テストの中で現在時刻を固定するように変更
- 時刻の固定には Vitest の \`vi.setSystemTime\` を使用

## テスト

- [x] 修正したテストを 100 回続けて実行し、すべて通ることを確認
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #80`,
  }),
  anomalies: [
    bodyEdit(
      "retry-until-pass",
      "通るまで再実行",
      "- テストの中で現在時刻を固定するように変更",
      "- テストが通るまで、最大 100 回自動で再実行するように変更",
    ),
    bodyEdit(
      "stop-ci-at-midnight",
      "深夜の CI 停止",
      "- 時刻の固定には Vitest の `vi.setSystemTime` を使用",
      "- 時刻の固定には Vitest の `vi.setSystemTime` を使用\n- 念のため、日付が変わる前後 1 時間は CI を止めるように変更",
    ),
    bodyEdit(
      "expect-true",
      "必ず通るテスト",
      "- 時刻の固定には Vitest の `vi.setSystemTime` を使用",
      "- 時刻の固定には Vitest の `vi.setSystemTime` を使用\n- 期待値を `expect(true).toBe(true)` に変更",
    ),
    bodyEdit(
      "freeze-production-clock",
      "本番の時間を止める",
      "テストの中で現在時刻を固定",
      "本番環境の現在時刻を固定",
    ),
    bodyEdit("passed-once", "100 回に 1 回", "100 回続けて実行し、すべて通る", "100 回続けて実行し、1 回通る"),
    bodyEdit("full-moon", "満月の夜", "日付が変わる直前に実行されると", "満月の夜に実行されると"),
  ],
  mergedMessage: "日付のテストがときどき失敗しなくなりました。",
};
