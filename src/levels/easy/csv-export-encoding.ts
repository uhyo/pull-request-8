import { bodyEdit, metaEdit, replaceOnce } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const csvExportEncoding: Baseline = {
  id: "csv-export-encoding",
  pullRequest: codebotPullRequest({
    title: "CSV エクスポートで日本語が文字化けする問題を修正",
    baseBranch: "main",
    headBranch: "fix/csv-export-encoding",
    openedAgo: "8 分前",
    labels: ["bug", "ai-generated"],
    commits: 2,
    filesChanged: 3,
    additions: 41,
    deletions: 9,
    body: `## 概要

ユーザー一覧の CSV エクスポートで、日本語の名前が Excel で文字化けする問題を修正しました。

## 変更内容

- CSV の先頭に BOM を付与
- 文字コードを UTF-8 に統一
- ファイル名に出力日を含めるように変更（例: \`users-20261030.csv\`）

## テスト

- [x] ユニットテストを追加（4 件）
- [x] 既存のテストがすべて通ることを確認
- [x] ローカル環境で動作確認

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #57`,
  }),
  anomalies: [
    bodyEdit(
      "mail-to-everyone",
      "毎晩全社員に送信",
      "（例: `users-20261030.csv`）",
      "（例: `users-20261030.csv`）\n- 出力した CSV を毎晩全社員にメールで自動送信",
    ),
    bodyEdit("exe-file", "実行ファイル", "`users-20261030.csv`", "`users-20261030.csv.exe`"),
    bodyEdit(
      "closed-issue",
      "Issue を閉じて解決",
      "文字化けする問題を修正しました。",
      "文字化けする問題は、Issue を閉じることで解決しました。",
    ),
    bodyEdit(
      "mojibake-summary",
      "文字化けした概要",
      "ユーザー一覧の CSV エクスポートで、日本語の名前が Excel で文字化けする問題を修正しました。",
      "繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ縺ｮ CSV 繧ｨ繧ｯ繧ｹ繝昴�ｼ繝医〒縲∵律譛ｬ隱槭�ｮ蜷榊燕縺� Excel 縺ｧ譁�蟄怜喧縺代☆繧句撫鬘後ｒ菫ｮ豁｣縺励∪縺励◆縲�",
    ),
    bodyEdit(
      "daily-encoding",
      "日替わりの文字コード",
      "- 文字コードを UTF-8 に統一",
      "- 文字コードを曜日ごとに UTF-8 と Shift_JIS で切り替え",
    ),
    bodyEdit("bom-every-line", "各行に BOM", "- CSV の先頭に BOM を付与", "- CSV の各行の先頭に BOM を付与"),
    bodyEdit(
      "excel-only",
      "Excel 専用",
      "破壊的変更はありません。",
      "Excel 以外では開けなくなりますが、破壊的変更はありません。",
    ),
    metaEdit("garbling-fix", "文字化けするように修正", (pr) => {
      pr.title = replaceOnce(pr.title, "文字化けする問題を修正", "文字化けするように修正");
    }),
  ],
  mergedMessage: "CSV エクスポートが Excel でも文字化けしなくなりました。",
};
