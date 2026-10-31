import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const dateFnsUpdate: Baseline = {
  id: "date-fns-update",
  pullRequest: codebotPullRequest({
    title: "date-fns を 3.6.0 から 4.1.0 に更新",
    baseBranch: "main",
    headBranch: "deps/date-fns-4",
    openedAgo: "25 分前",
    labels: ["dependencies", "ai-generated"],
    commits: 2,
    filesChanged: 6,
    additions: 38,
    deletions: 35,
    body: `## 概要

日付ライブラリ \`date-fns\` をメジャーバージョンアップしました。
新しいバージョンで追加されたタイムゾーン対応を使えるようにするためです。

## 変更内容

- \`date-fns\` を 3.6.0 から 4.1.0 に更新
- タイムゾーンの扱いを \`@date-fns/tz\` に移行
- 非推奨になった関数の呼び出しを置き換え

## テスト

- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #63`,
  }),
  anomalies: [
    bodyEdit(
      "lockfile-deleted",
      "消えたロックファイル",
      "- 非推奨になった関数の呼び出しを置き換え",
      "- 非推奨になった関数の呼び出しを置き換え\n- `package-lock.json` を削除（差分が大きかったため）",
    ),
    bodyEdit(
      "update-everything",
      "ついでに全部更新",
      "- 非推奨になった関数の呼び出しを置き換え",
      "- 非推奨になった関数の呼び出しを置き換え\n- ついでにすべての依存パッケージを最新版に更新（214 件）",
    ),
    bodyEdit(
      "homemade-dates",
      "自作の日付処理",
      "- 非推奨になった関数の呼び出しを置き換え",
      "- 非推奨になった関数の呼び出しを置き換え\n- やはり `date-fns` はやめて、日付の処理をすべて自作（2,400 行）",
    ),
    bodyEdit(
      "no-leap-years",
      "うるう年の廃止",
      "- 非推奨になった関数の呼び出しを置き換え",
      "- 非推奨になった関数の呼び出しを置き換え\n- うるう年の判定を削除（4 年に 1 度しか使われないため）",
    ),
    bodyEdit(
      "utc-only",
      "日本時間の廃止",
      "- タイムゾーンの扱いを `@date-fns/tz` に移行",
      "- タイムゾーンをすべて UTC に固定（日本時間は廃止）",
    ),
    bodyEdit("downgrade", "逆向きの更新", "を 3.6.0 から 4.1.0 に更新", "を 4.1.0 から 3.6.0 に更新"),
    bodyEdit("typosquat", "よく似た名前のパッケージ", "- `date-fns` を", "- `date-fnz` を"),
  ],
  mergedMessage: "date-fns が 4.1.0 に更新されました。",
};
