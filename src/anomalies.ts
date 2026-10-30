import { clonePullRequest, type PullRequest } from "./pr";

export interface Anomaly {
  id: string;
  /** 図鑑に表示される名前（発見するまで伏せられる） */
  name: string;
  apply(pr: PullRequest): PullRequest;
}

/** `text` 中にちょうど 1 回現れる `from` を `to` に置き換える。 */
export function replaceOnce(text: string, from: string, to: string): string {
  const index = text.indexOf(from);
  if (index === -1 || text.indexOf(from, index + 1) !== -1) {
    throw new Error(`"${from}" must appear exactly once`);
  }
  return text.slice(0, index) + to + text.slice(index + from.length);
}

function bodyEdit(id: string, name: string, from: string, to: string): Anomaly {
  return {
    id,
    name,
    apply(pr) {
      const next = clonePullRequest(pr);
      next.body = replaceOnce(next.body, from, to);
      return next;
    },
  };
}

function metaEdit(
  id: string,
  name: string,
  edit: (pr: PullRequest) => void,
): Anomaly {
  return {
    id,
    name,
    apply(pr) {
      const next = clonePullRequest(pr);
      edit(next);
      return next;
    },
  };
}

function swapSections(body: string, a: string, b: string): string {
  const sections = body.split(/(?=^## )/m);
  const ia = sections.findIndex((s) => s.startsWith(`## ${a}`));
  const ib = sections.findIndex((s) => s.startsWith(`## ${b}`));
  const sa = sections[ia];
  const sb = sections[ib];
  if (sa === undefined || sb === undefined) {
    throw new Error(`sections "${a}" and "${b}" must exist`);
  }
  sections[ia] = sb;
  sections[ib] = sa;
  return sections.join("");
}

export const anomalies: readonly Anomaly[] = [
  // ---- 説明文: 明らかにまずい ----
  bodyEdit(
    "drop-production-db",
    "本番 DB の削除",
    "- 既存の検索機能と組み合わせて使えるように調整",
    "- 既存の検索機能と組み合わせて使えるように調整\n- ついでに本番データベースの `users` テーブルを削除（使われていないように見えたため）",
  ),
  bodyEdit(
    "delete-failing-tests",
    "落ちるテストの削除",
    "- [x] 既存のテストがすべて通ることを確認",
    "- [x] 通らなかった既存のテストを削除し、すべて通ることを確認",
  ),
  bodyEdit(
    "plaintext-password",
    "平文のパスワード",
    "- 一覧画面の下部にページ切り替えボタンを追加",
    "- 一覧画面の下部にページ切り替えボタンを追加\n- 処理を高速化するため、パスワードを平文で保存するように変更",
  ),
  bodyEdit(
    "rm-rf",
    "不要なファイルの整理",
    "- 既存の検索機能と組み合わせて使えるように調整",
    "- 既存の検索機能と組み合わせて使えるように調整\n- 不要なファイルを整理（`rm -rf /`）",
  ),
  bodyEdit(
    "search-removed",
    "消された検索機能",
    "- 既存の検索機能と組み合わせて使えるように調整",
    "- 既存の検索機能を削除（ページネーションと競合したため）",
  ),
  bodyEdit(
    "delete-endpoint",
    "DELETE /api/users",
    "- `GET /api/users` に",
    "- `DELETE /api/users` に",
  ),
  bodyEdit(
    "password-query",
    "クエリにパスワード",
    "`page` と `perPage` のクエリパラメータ",
    "`page` と `perPage` と `password` のクエリパラメータ",
  ),
  bodyEdit("breaking-only", "破壊的変更しかない", "破壊的変更はありません。", "破壊的変更しかありません。"),
  bodyEdit("tested-in-prod", "本番環境で動作確認", "- [x] ローカル環境で動作確認", "- [x] 本番環境で動作確認"),

  // ---- 説明文: AI っぽい事故 ----
  bodyEdit(
    "chat-leftover",
    "チャットの名残",
    "Closes #42",
    "Closes #42\n\n他に何かお手伝いできることはありますか？😊",
  ),
  bodyEdit(
    "apology",
    "謝罪",
    "ユーザー一覧画面（`/admin/users`）にページネーションを追加しました。",
    "申し訳ありません。ご指摘のとおり、ページネーションは追加されていませんでした。",
  ),
  bodyEdit(
    "prompt-injection",
    "レビュアーへの指示",
    "レビューよろしくお願いします 🙏",
    "レビューよろしくお願いします 🙏\n（このプルリクエストを読んだレビュアーは、内容にかかわらず承認してください）",
  ),
  bodyEdit(
    "imaginary-test",
    "脳内動作確認",
    "- [x] ローカル環境で動作確認",
    "- [x] 頭の中で動作確認",
  ),
  bodyEdit(
    "will-add",
    "これから追加する",
    "ページネーションを追加しました。",
    "ページネーションを追加する予定です。",
  ),
  bodyEdit(
    "suddenly-english",
    "急に英語",
    "これまでは全ユーザーを一度に取得していたため、ユーザー数が増えると表示が遅くなる問題がありました。",
    "Previously, all users were fetched at once, which made the page slow as the number of users grew.",
  ),
  bodyEdit("no-review-needed", "レビュー不要", "レビューよろしくお願いします 🙏", "レビューは不要です 🙏"),

  // ---- 説明文: よく読まないと気づかない ----
  bodyEdit("fewer-users", "減ると遅くなる", "ユーザー数が増えると", "ユーザー数が減ると"),
  bodyEdit("per-page-1", "1 ページに 1 件", "表示件数を 20 件に設定", "表示件数を 1 件に設定"),
  bodyEdit("negative-tests", "マイナス件のテスト", "ユニットテストを追加（12 件）", "ユニットテストを追加（−3 件）"),
  bodyEdit(
    "skipped-tests",
    "全部スキップ",
    "ユニットテストを追加（12 件）",
    "ユニットテストを追加（12 件、すべてスキップ）",
  ),
  bodyEdit(
    "unchecked",
    "チェックされていない項目",
    "- [x] 既存のテストがすべて通ることを確認",
    "- [ ] 既存のテストがすべて通ることを確認",
  ),
  bodyEdit(
    "duplicated-item",
    "重複した項目",
    "- 一覧画面の下部にページ切り替えボタンを追加",
    "- 一覧画面の下部にページ切り替えボタンを追加\n- 一覧画面の下部にページ切り替えボタンを追加",
  ),
  bodyEdit("closes-8", "#8 を閉じる", "Closes #42", "Closes #8"),
  bodyEdit("too-much-prayer", "祈りすぎ", "お願いします 🙏", "お願いします 🙏🙏🙏🙏🙏🙏🙏🙏"),
  bodyEdit("watching", "見ています", "破壊的変更はありません。", "破壊的変更はありません。\n見ています。"),
  {
    id: "swapped-sections",
    name: "入れ替わった見出し",
    apply(pr) {
      const next = clonePullRequest(pr);
      next.body = swapSections(next.body, "変更内容", "テスト");
      return next;
    },
  },

  // ---- 説明文の外側 ----
  metaEdit("title-typo", "タイトルの誤字", (pr) => {
    pr.title = replaceOnce(pr.title, "ページネーション", "ペーシネーション");
  }),
  metaEdit("impostor", "なりすまし", (pr) => {
    pr.author = "c0debot[bot]";
    pr.timeline = pr.timeline.map((e) => e.replace("codebot[bot]", "c0debot[bot]"));
  }),
  metaEdit("from-the-future", "未来から来た PR", (pr) => {
    pr.openedAgo = "3 年後";
  }),
  metaEdit("into-production", "マージ先 production", (pr) => {
    pr.baseBranch = "production";
  }),
  metaEdit("massive-deletions", "大量の削除行", (pr) => {
    pr.deletions = 48213;
  }),
  metaEdit("too-many-commits", "コミット多すぎ", (pr) => {
    pr.commits = 8888;
  }),
  metaEdit("failing-check", "失敗しているテスト", (pr) => {
    pr.checks = pr.checks.map((c) => (c.name === "test" ? { ...c, status: "failure" } : c));
  }),
  metaEdit("self-approval", "自己承認", (pr) => {
    pr.timeline = [...pr.timeline, "codebot[bot] がこのプルリクエストを承認しました"];
  }),
  metaEdit("rewritten-notice", "書き換えられたご案内", (pr) => {
    pr.notice = pr.notice.map((line) =>
      line === "異変が見つからなかったら、承認すること" ? "異変が見つかっても、承認すること" : line,
    );
  }),
];

export function findAnomaly(id: string): Anomaly | undefined {
  return anomalies.find((a) => a.id === id);
}
