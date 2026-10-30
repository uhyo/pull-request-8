import "./style.css";
import { anomalies } from "./anomalies";
import {
  GOAL,
  isMergeable,
  newGame,
  pullRequestFor,
  submitReview,
  type GameState,
  type Verdict,
} from "./game";
import { escapeHtml, renderMarkdown } from "./markdown";
import type { PullRequest } from "./pr";
import { loadCleared, loadDiscovered, saveCleared, saveDiscovered } from "./storage";

const app = document.querySelector<HTMLDivElement>("#app")!;
const random = Math.random;

let state: GameState = newGame(random);
let discovered = loadDiscovered();
/** 今回のプレイで見つけた異変 */
let foundThisRun = new Set<string>();
let busy = false;

const fmt = (n: number) => n.toLocaleString("ja-JP");

const robotAvatar = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="11" width="28" height="22" rx="6" fill="currentColor"/><rect x="18.5" y="4" width="3" height="7" fill="currentColor"/><circle cx="20" cy="4" r="2.5" fill="currentColor"/><circle cx="14.5" cy="21" r="3" fill="var(--avatar-eye)"/><circle cx="25.5" cy="21" r="3" fill="var(--avatar-eye)"/><rect x="14" y="27" width="12" height="2" rx="1" fill="var(--avatar-eye)"/></svg>`;

// ---------------------------------------------------------------- タイトル

function renderTitle(): void {
  const cleared = loadCleared();
  const items = anomalies
    .map((a) =>
      discovered.has(a.id)
        ? `<li class="found">${escapeHtml(a.name)}</li>`
        : `<li class="unknown">？？？</li>`,
    )
    .join("");

  app.innerHTML = `
    <div class="title-screen">
      <div class="title-inner">
        <p class="title-repo">acme / admin-console</p>
        <h1 class="game-title">プルリクエスト <span class="game-title-number">#8</span></h1>
        <p class="tagline">AI が書いたプルリクエストを、説明文だけでレビューしてください。</p>
        <button class="btn primary big" id="start" type="button">レビューを始める</button>
        ${cleared ? `<p class="cleared-mark">✓ #8 をマージ済み</p>` : ""}
        <details class="collection">
          <summary>見つけた異変 ${discovered.size} / ${anomalies.length}</summary>
          <ul>${items}</ul>
        </details>
      </div>
    </div>`;

  app.querySelector("#start")!.addEventListener("click", () => {
    state = newGame(random);
    foundThisRun = new Set();
    void transition(
      "レビュー依頼が届きました",
      "codebot[bot] があなたをレビュアーに指定しました",
      renderRound,
    );
  });
}

// ---------------------------------------------------------- プルリクエスト

function renderChecks(pr: PullRequest): string {
  const failed = pr.checks.filter((c) => c.status === "failure").length;
  const summary =
    failed > 0
      ? `<span class="check-summary failure">✕ ${pr.checks.length} 件中 ${failed} 件のチェックが失敗しました</span>`
      : `<span class="check-summary success">✓ すべてのチェックが成功しました</span>`;
  const rows = pr.checks
    .map((c) => {
      const icon = c.status === "success" ? "✓" : c.status === "failure" ? "✕" : "−";
      const label = c.status === "success" ? "成功" : c.status === "failure" ? "失敗" : "スキップ";
      return `<li class="check ${c.status}"><span class="check-icon">${icon}</span><code>${escapeHtml(c.name)}</code><span class="check-label">${label}</span></li>`;
    })
    .join("");
  return `<section class="panel checks">${summary}<ul>${rows}</ul></section>`;
}

function renderReviewBox(): string {
  return `
    <section class="panel review">
      <h2>レビューを送信</h2>
      <textarea id="review-comment" rows="3" placeholder="コメント（任意）"></textarea>
      <div class="actions">
        <button class="btn danger" type="button" data-verdict="request-changes">変更をリクエスト</button>
        <button class="btn primary" type="button" data-verdict="approve">承認</button>
      </div>
    </section>`;
}

function renderMergeBox(): string {
  return `
    <section class="panel merge">
      <p class="merge-status">✓ 承認済み — このプルリクエストはマージできます</p>
      <button class="btn primary big" type="button" id="merge">プルリクエストをマージ</button>
    </section>`;
}

function renderPullRequest(pr: PullRequest, number: number, goal: boolean): string {
  const notice = pr.notice.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const labels = pr.labels
    .map((l) => `<span class="label label-${escapeHtml(l)}">${escapeHtml(l)}</span>`)
    .join("");
  const timeline = pr.timeline
    .map((e) => `<li><span class="timeline-dot"></span>${escapeHtml(e)}</li>`)
    .join("");

  return `
    <header class="topbar">
      <span class="logo" aria-hidden="true">8</span>
      <span class="repo">acme / <b>admin-console</b></span>
    </header>
    <main class="page">
      <aside class="notice" role="note">
        <p class="notice-title">ご案内</p>
        <ol>${notice}</ol>
      </aside>

      <div class="pr-header">
        <h1><span class="pr-title">${escapeHtml(pr.title)}</span> <span class="pr-number">#${number}</span></h1>
        <p class="pr-meta">
          <span class="state-badge">オープン</span>
          <span><b>${escapeHtml(pr.author)}</b> が <code class="branch">${escapeHtml(pr.headBranch)}</code> から
          <code class="branch">${escapeHtml(pr.baseBranch)}</code> へ ${fmt(pr.commits)} 件のコミットのマージを求めています</span>
        </p>
      </div>

      <nav class="tabs">
        <button class="tab active" type="button">会話</button>
        <button class="tab" type="button" data-locked>コミット <span class="count">${fmt(pr.commits)}</span></button>
        <button class="tab" type="button" data-locked>チェック <span class="count">${pr.checks.length}</span></button>
        <button class="tab" type="button" data-locked>変更ファイル <span class="count">${fmt(pr.filesChanged)}</span></button>
        <span class="diffstat"><span class="add">+${fmt(pr.additions)}</span> <span class="del">−${fmt(pr.deletions)}</span></span>
      </nav>

      <div class="layout">
        <div class="main-column">
          <article class="comment">
            <div class="avatar">${robotAvatar}</div>
            <div class="comment-box">
              <div class="comment-header">
                <b>${escapeHtml(pr.author)}</b> <span class="bot-badge">bot</span>
                <span class="muted">がコメント · ${escapeHtml(pr.openedAgo)}</span>
              </div>
              <div class="markdown-body">${renderMarkdown(pr.body)}</div>
            </div>
          </article>
          <ul class="timeline">${timeline}</ul>
          ${renderChecks(pr)}
          ${goal ? renderMergeBox() : renderReviewBox()}
        </div>

        <aside class="sidebar">
          <div class="side-section"><h3>レビュアー</h3><p>あなた</p></div>
          <div class="side-section"><h3>ラベル</h3><p class="labels">${labels}</p></div>
          <div class="side-section"><h3>担当者</h3><p class="muted">なし</p></div>
        </aside>
      </div>
    </main>`;
}

function renderRound(): void {
  const { round } = state;
  const mergeable = isMergeable(state);
  const pr = pullRequestFor(round);
  if (mergeable) pr.timeline.push("あなた がこのプルリクエストを承認しました");
  app.innerHTML = renderPullRequest(pr, round.number, mergeable);
  window.scrollTo({ top: 0 });

  for (const tab of app.querySelectorAll("[data-locked]")) {
    tab.addEventListener("click", () => toast("このゲームでは説明文しか読めません。"));
  }
  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-verdict]")) {
    button.addEventListener("click", () => void review(button.dataset.verdict as Verdict));
  }
  app.querySelector("#merge")?.addEventListener("click", () => void merge());
}

async function review(verdict: Verdict): Promise<void> {
  if (busy) return;
  const { anomalyId } = state.round;
  const result = submitReview(state, verdict, random);
  if (result.correct && anomalyId !== null) {
    foundThisRun.add(anomalyId);
    discovered.add(anomalyId);
    saveDiscovered(discovered);
  }
  state = result.state;
  await transition(
    verdict === "approve" ? "承認しました" : "変更をリクエストしました",
    isMergeable(state) ? "" : "codebot[bot] が新しいプルリクエストを作成しています…",
    renderRound,
  );
}

async function merge(): Promise<void> {
  if (busy) return;
  saveCleared();
  await transition("マージしています…", "", renderEnding);
}

// ---------------------------------------------------------------- エンディング

function renderEnding(): void {
  const found = anomalies.filter((a) => foundThisRun.has(a.id));
  const list =
    found.length > 0
      ? `<ul class="found-list">${found.map((a) => `<li>${escapeHtml(a.name)}</li>`).join("")}</ul>`
      : `<p class="muted">（異変はひとつも見つかりませんでした）</p>`;

  app.innerHTML = `
    <div class="title-screen ending">
      <div class="title-inner">
        <p class="merged-badge">マージ済み</p>
        <h1 class="game-title">プルリクエスト <span class="game-title-number">#${GOAL}</span></h1>
        <p class="tagline">ユーザー一覧画面にページネーションが追加されました。</p>
        <dl class="stats">
          <div><dt>レビュー回数</dt><dd>${state.reviews}</dd></div>
          <div><dt>判断ミス</dt><dd>${state.mistakes}</dd></div>
          <div><dt>見つけた異変（累計）</dt><dd>${discovered.size} / ${anomalies.length}</dd></div>
        </dl>
        <h2 class="found-heading">今回見つけた異変</h2>
        ${list}
        <button class="btn big" id="back" type="button">タイトルへ戻る</button>
      </div>
    </div>`;
  app.querySelector("#back")!.addEventListener("click", renderTitle);
}

// ---------------------------------------------------------------- 演出

const overlay = document.createElement("div");
overlay.className = "overlay";
overlay.innerHTML = `<p class="overlay-main"></p><p class="overlay-sub"></p>`;
document.body.append(overlay);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 画面を暗転させ、暗いあいだに次の画面を描画してから明るくする */
async function transition(main: string, sub: string, renderNext: () => void): Promise<void> {
  busy = true;
  overlay.querySelector(".overlay-main")!.textContent = main;
  overlay.querySelector(".overlay-sub")!.textContent = sub;
  overlay.classList.add("visible");
  await sleep(1800);
  renderNext();
  overlay.classList.remove("visible");
  await sleep(500);
  busy = false;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toastEl = document.createElement("div");
toastEl.className = "toast";
toastEl.setAttribute("role", "status");
document.body.append(toastEl);

function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 2200);
}

renderTitle();
