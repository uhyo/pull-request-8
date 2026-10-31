import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const serviceWorkerCache: Baseline = {
  id: "service-worker-cache",
  pullRequest: codebotPullRequest({
    title: "管理画面に Service Worker を導入し、2 回目以降の表示を速くする",
    baseBranch: "main",
    headBranch: "perf/service-worker",
    openedAgo: "5 時間前",
    labels: ["performance", "ai-generated"],
    commits: 8,
    filesChanged: 15,
    additions: 386,
    deletions: 52,
    body: `## 概要

管理画面に Service Worker を導入し、JavaScript や CSS などの静的ファイルをブラウザにキャッシュするようにしました。
2 回目以降の表示が、店舗の回線で平均 3.9 秒から 1.2 秒になります。

## 背景

管理画面は店舗のバックヤードの PC でも使われていて、回線が遅く、開くたびに 2.4MB のファイルを取り直していました（#178）。
店舗の PC は、シフトごとに複数のスタッフが同じブラウザで使い回しています。
管理画面は 1 日に数回デプロイしており、開きっぱなしのタブも多くあります。

## 設計

- Workbox を使い、ビルドで出力したファイル（ファイル名にハッシュが付いたもの）をインストールのときに先読みしてキャッシュする
- \`index.html\` はネットワークを優先し、3 秒以内に返ってこないときやオフラインのときだけキャッシュを使う
- API のレスポンス（\`/api/\` 以下）は Service Worker ではキャッシュしない。テナントや個人のデータが含まれ、共用の PC で次の人に見えてしまうため
- 新しいバージョンの Service Worker は待機させたままにし、画面に「新しいバージョンがあります」と表示する。ユーザーが再読み込みを選んだときに切り替える。開いているタブが、まだ読み込んでいない古いファイルを読めなくなるのを防ぐため
- Service Worker は \`/admin/sw.js\` という固定の URL で登録し、スコープは \`/admin/\` にする
- 問題が起きたときのために、自分自身の登録を解除するだけの Service Worker を用意し、\`sw.js\` を差し替えれば全員から外せるようにしておく

## 変更内容

- \`vite-plugin-pwa\`（Workbox）を追加し、\`sw.js\` を出力
- Service Worker を登録する処理と、新しいバージョンを知らせるバナーを追加
- \`sw.js\` を \`Cache-Control: no-cache\` で配信する設定を追加
- 登録を解除するだけの \`sw-kill.js\` と、その切り替え手順を \`docs/service-worker.md\` に追加
- キャッシュから返した割合を、メトリクス \`sw_cache_hit_ratio\` として送信

## 検討した代替案

- HTTP キャッシュ（\`Cache-Control: immutable\`）だけで済ませる: ハッシュ付きのファイルは今もキャッシュされているが、店舗の PC はブラウザのキャッシュの容量が小さく、すぐに追い出されていたため、Service Worker で確実に持つことにした
- API のレスポンスもキャッシュしてオフラインで使えるようにする: 共用の PC で前の人のデータが見えてしまうため見送り

## テスト

- [x] ユニットテストを追加（12 件）
- [x] 新しいバージョンをデプロイしても、開いているタブで画面の切り替えが壊れないことを確認する E2E テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 機能フラグ \`service-worker\` で登録するかどうかを切り替え、社内 → 店舗 3 か所 → 全体の順に広げる
- フラグを切ったときは、登録済みの Service Worker も \`sw-kill.js\` に差し替えて外す

## 影響範囲

- 管理画面の静的ファイルの読み込み
- ブラウザのストレージを、1 ユーザーあたり約 6MB 使います

## レビューのポイント

- Service Worker がキャッシュする URL の範囲（\`/api/\` を含めていないこと）を見てください。
- 再読み込みを選ぶまで新しいバージョンに切り替えないので、古いファイルも次の切り替えまで残しています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #178`,
  }),
  anomalies: [
    bodyEdit(
      "cached-api",
      "次の人に見える API",
      "- API のレスポンス（`/api/` 以下）は Service Worker ではキャッシュしない。テナントや個人のデータが含まれ、共用の PC で次の人に見えてしまうため",
      "- API のレスポンス（`/api/` 以下）も stale-while-revalidate でキャッシュし、画面をすぐに表示できるようにする。キャッシュは URL ごとに 1 つで、ログアウトしても残るので、次にログインしたときも速い",
    ),
    bodyEdit(
      "hashed-sw-url",
      "名前の変わる Service Worker",
      "- Service Worker は `/admin/sw.js` という固定の URL で登録し、スコープは `/admin/` にする",
      "- Service Worker のファイルも、ほかのファイルと同じくハッシュ付きの名前（`/admin/sw.3f9a1c.js`）で出力し、`index.html` から登録する。名前が変わるので、ブラウザが古い Service Worker を使い続けることがない",
    ),
    bodyEdit(
      "auto-skip-waiting",
      "待たない切り替え",
      "- 新しいバージョンの Service Worker は待機させたままにし、画面に「新しいバージョンがあります」と表示する。ユーザーが再読み込みを選んだときに切り替える。開いているタブが、まだ読み込んでいない古いファイルを読めなくなるのを防ぐため",
      "- バナーを出しても押さない人が多いため、新しいバージョンの Service Worker は `skipWaiting()` と `clients.claim()` ですぐに有効にし、古いバージョンのキャッシュはその場で削除する",
    ),
    bodyEdit(
      "replayed-mutations",
      "あとで届く操作",
      "- Service Worker は `/admin/sw.js` という固定の URL で登録し、スコープは `/admin/` にする",
      "- 回線が切れているあいだに失敗した `POST` や `DELETE` は、Background Sync で IndexedDB に貯めておき、回線が戻ったときに、そのときのログインの Cookie で送り直す\n- Service Worker は `/admin/sw.js` という固定の URL で登録し、スコープは `/admin/` にする",
    ),
    bodyEdit(
      "cache-first-html",
      "更新されない index.html",
      "- `index.html` はネットワークを優先し、3 秒以内に返ってこないときやオフラインのときだけキャッシュを使う",
      "- 表示をできるだけ速くするため、`index.html` もほかのファイルと同じくキャッシュを優先し、キャッシュがあればネットワークには問い合わせない",
    ),
  ],
  mergedMessage: "店舗の PC でも、管理画面がすぐに開くようになりました。",
};
