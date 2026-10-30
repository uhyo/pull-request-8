# プルリクエスト #8

▶ https://uhyo.github.io/pull-request-8/

AI が書いたプルリクエストを、**説明文だけ**でレビューする異変探しゲームです。

## 遊び方

毎回、同じ AI（`codebot[bot]`）から同じプルリクエストが届きます。

- いつもどおりの説明文なら **承認**
- どこかに異変があれば **変更をリクエスト**
- 正しく判断すると番号が 1 つ進み、間違えると **#1** に戻ります
- **#8** を正しく承認できたらマージされてクリア

差分（変更ファイル）は見られません。説明文を信じるしかありません。
見つけた異変は図鑑としてブラウザに保存されます。

## 開発

```sh
npm install
npm run dev      # 開発サーバー
npm test         # テスト（Vitest）
npm run build    # 型チェック + dist/ に出力
```

- `src/pr.ts` — 「いつもの」プルリクエスト
- `src/anomalies.ts` — 異変の一覧（ここに足せば増やせます）
- `src/game.ts` — 進行ロジック（番号・判定・異変の抽選）
- `src/main.ts` — 画面の描画と演出

## デプロイ

`master` に push すると GitHub Actions がテスト・ビルドして GitHub Pages に公開します
（`.github/workflows/deploy.yml`）。リポジトリの Settings → Pages で
Source を「GitHub Actions」にしておく必要があります。
