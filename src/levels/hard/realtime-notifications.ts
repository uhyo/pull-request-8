import { bodyEdit } from "../../anomalies";
import type { Baseline } from "..";
import { codebotPullRequest } from "../codebot";

export const realtimeNotifications: Baseline = {
  id: "realtime-notifications",
  pullRequest: codebotPullRequest({
    title: "通知の取得を 15 秒ごとのポーリングから WebSocket に切り替える",
    baseBranch: "main",
    headBranch: "feat/notifications-websocket",
    openedAgo: "2 時間前",
    labels: ["enhancement", "ai-generated"],
    commits: 10,
    filesChanged: 24,
    additions: 598,
    deletions: 143,
    body: `## 概要

管理画面の通知（承認の依頼やコメントなど）を、15 秒ごとのポーリングではなく、WebSocket でサーバーから届けるようにしました。
通知が届くまでの時間が平均 7.5 秒から 1 秒未満になり、ポーリングによる API へのリクエストもなくなります。

## 背景

ポーリングのリクエストは、管理画面の API へのリクエスト全体の 35% を占めていました（#170）。
ほとんどは「新しい通知はありません」という空のレスポンスです。
API は 6 台の Pod で動いており、通知を作る処理と、ユーザーが接続している Pod は同じとは限りません。

## 設計

- 新しい \`notifications-gateway\`（WebSocket サーバー）を追加し、画面はログイン後にここへ接続する
- 通知を作った API は、Redis Streams の \`notifications\` に通知を追加する。各ゲートウェイの Pod がこれを読み、自分に接続しているユーザー宛ての通知だけを送る
- 通知は今までどおり、先に \`notifications\` テーブルに保存する。WebSocket はあくまで「新しい通知がある」ことを早く伝える手段で、取りこぼしても通知は失われない
- 再接続したときは、画面が最後に受け取った通知の ID を送り、それより新しい通知をテーブルから取得する
- 切断されたら、指数バックオフ（1 秒から最大 60 秒、ランダムなジッター付き）で再接続する。デプロイで全員の接続が同時に切れても、再接続が一度に集中しないようにするため
- 接続のときは、Cookie のセッションを検証し、\`Origin\` ヘッダーが管理画面のドメインであることを確認する。WebSocket には CORS が適用されないため、他のサイトから接続されるのを防ぐにはこの確認が必要
- WebSocket に接続できない環境（社内のプロキシなど）では、今までどおりのポーリングに戻る

## 変更内容

- \`notifications-gateway\` を追加（Deployment は 3 レプリカ、HPA で最大 10 まで）
- 通知を作る処理で、テーブルへの保存のあとに Redis Streams へ追加する処理を追加
- 画面の通知の取得を、WebSocket を優先し、だめならポーリングに戻す \`NotificationClient\` に置き換え
- ロードバランサーに WebSocket 用の設定（アイドルタイムアウト 1 時間）を追加
- 接続数と、通知が届くまでの時間をメトリクスとして出力

## 検討した代替案

- Server-Sent Events: 一方向で十分なので候補だったが、社内のプロキシで接続が切れやすいことがわかり、WebSocket とポーリングの組み合わせにした
- API の Pod で直接 WebSocket を受ける: Pod が増えないが、デプロイのたびに全員の接続が切れ、API のデプロイの頻度に通知が引きずられるため、ゲートウェイを分けた

## テスト

- [x] ユニットテストを追加（29 件）
- [x] ゲートウェイの Pod を 1 台止めても、再接続のあとで通知を取りこぼさないことを確認する結合テストを追加
- [x] 既存のテストがすべて通ることを確認
- [x] ステージング環境で動作確認

## ロールアウト

- 機能フラグ \`notifications-websocket\` で切り替え、社内のテナント → 全テナントの 10% → 100% の順に広げる
- ポーリングの処理は、フォールバックとしてこのまま残す

## 影響範囲

- 管理画面の通知
- 同時接続数は最大で約 1 万 2 千を見込んでおり、ゲートウェイ 3 台で処理できることを負荷試験で確認しています

## レビューのポイント

- \`Origin\` の確認と、再接続のバックオフを見てください。
- 通知の本文は WebSocket では送らず、通知の ID だけを送って、本文は権限を確認する既存の API から取得しています。

## 備考

破壊的変更はありません。
レビューよろしくお願いします 🙏

Closes #170`,
  }),
  anomalies: [
    bodyEdit(
      "no-origin-check",
      "確かめない Origin",
      "- 接続のときは、Cookie のセッションを検証し、`Origin` ヘッダーが管理画面のドメインであることを確認する。WebSocket には CORS が適用されないため、他のサイトから接続されるのを防ぐにはこの確認が必要",
      "- 接続のときは、Cookie のセッションを検証する。WebSocket には CORS が適用されないため、`Origin` ヘッダーの確認は不要",
    ),
    bodyEdit(
      "local-only-delivery",
      "同じ Pod の人にだけ",
      "- 通知を作った API は、Redis Streams の `notifications` に通知を追加する。各ゲートウェイの Pod がこれを読み、自分に接続しているユーザー宛ての通知だけを送る",
      "- 通知を作った API は、Redis などを経由せず、HTTP でゲートウェイの Service に直接通知を送る。Service が振り分けた Pod は、自分に接続しているユーザー宛ての通知だけを送る（中継の仕組みが不要になり、遅延も小さい）",
    ),
    bodyEdit(
      "pubsub-only",
      "保存しない通知",
      "- 通知は今までどおり、先に `notifications` テーブルに保存する。WebSocket はあくまで「新しい通知がある」ことを早く伝える手段で、取りこぼしても通知は失われない\n- 再接続したときは、画面が最後に受け取った通知の ID を送り、それより新しい通知をテーブルから取得する",
      "- WebSocket で届けるようになったため、`notifications` テーブルへの保存はやめ、通知は Redis Pub/Sub だけで流す。Redis Pub/Sub は配信を保証するので、取りこぼしの心配はない",
    ),
    bodyEdit(
      "instant-reconnect",
      "一斉に再接続",
      "- 切断されたら、指数バックオフ（1 秒から最大 60 秒、ランダムなジッター付き）で再接続する。デプロイで全員の接続が同時に切れても、再接続が一度に集中しないようにするため",
      "- 切断されたら、通知の遅れを最小にするため、待たずにすぐ再接続する。失敗した場合も 100ms ごとに再接続を試み続ける",
    ),
    bodyEdit(
      "token-in-query",
      "URL に載せたトークン",
      "- 接続のときは、Cookie のセッションを検証し、",
      "- ゲートウェイは別のドメイン（`ws.acme-admin.example`）で Cookie が届かないため、接続の URL に `?session=` としてセッション ID をそのまま付けて送る。ゲートウェイはそれを検証し、",
    ),
    bodyEdit(
      "body-over-socket",
      "そのまま流す本文",
      "- 通知の本文は WebSocket では送らず、通知の ID だけを送って、本文は権限を確認する既存の API から取得しています。",
      "- API への往復を減らすため、通知の本文もそのまま WebSocket で送っています。宛先はテナント単位で、同じテナントに接続している全員に同じ通知を流し、自分宛てでないものは画面側で非表示にしています。",
    ),
  ],
  mergedMessage: "通知が WebSocket ですぐに届くようになりました。",
};
