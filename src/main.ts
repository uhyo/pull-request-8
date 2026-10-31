import "./style.css";
import { markAnomaly } from "./diff";
import {
  GOAL,
  START,
  newGame,
  normalPullRequestFor,
  pullRequestFor,
  submitReview,
  type GameState,
  type Round,
  type Verdict,
} from "./game";
import {
  allAnomalies,
  findBaseline,
  findLevel,
  isPlayable,
  levels,
  type Level,
  type PlayableLevel,
  type ProblemSet,
} from "./levels";
import { escapeHtml, renderMarkdown } from "./markdown";
import type { PullRequest } from "./pr";
import { clearShareText, xShareUrl } from "./share";
import {
  clearProgress,
  loadCleared,
  loadDiscovered,
  loadProgress,
  saveCleared,
  saveDiscovered,
  saveProgress,
} from "./storage";

const app = document.querySelector<HTMLDivElement>("#app")!;
const random = Math.random;

// 難易度を選んでゲームを始めたときに決まる
let level!: PlayableLevel;
let state!: GameState;
let discovered = new Set<string>();
/** 今回のプレイで見つけた異変 */
let foundThisRun = new Set<string>();
let busy = false;

const fmt = (n: number) => n.toLocaleString("ja-JP");

/** 不具合の報告先。ゲームの進行が消えないように新しいタブで開く */
const issuesUrl = "https://github.com/uhyo/pull-request-8/issues";
const reportLink = (className: string, text: string) =>
  `<a class="${className}" href="${issuesUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;

const xLogo = `<svg viewBox="0 0 24 24" role="img" aria-label="X"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;

const robotAvatar = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="11" width="28" height="22" rx="6" fill="currentColor"/><rect x="18.5" y="4" width="3" height="7" fill="currentColor"/><circle cx="20" cy="4" r="2.5" fill="currentColor"/><circle cx="14.5" cy="21" r="3" fill="var(--avatar-eye)"/><circle cx="25.5" cy="21" r="3" fill="var(--avatar-eye)"/><rect x="14" y="27" width="12" height="2" rx="1" fill="var(--avatar-eye)"/></svg>`;

// ---------------------------------------------------------------- タイトル

/** 見つけた異変のうち、今もその難易度にあるものの数（なくなった異変は数えない） */
function countFound(problems: ProblemSet, found: ReadonlySet<string>): number {
  return allAnomalies(problems).filter((a) => found.has(a.id)).length;
}

function renderLevelButton(l: Level): string {
  const head = `<span class="level-name">${escapeHtml(l.name)}</span><span class="level-desc">${escapeHtml(l.description)}</span>`;
  if (!isPlayable(l)) {
    return `<button class="level" type="button" disabled>${head}<span class="level-status">準備中</span></button>`;
  }
  // 異変をまだ 1 つも見つけていないうちは、数を見せずに第一印象をシンプルにする
  const found = countFound(l.problems, loadDiscovered(l.id));
  const cleared = loadCleared(l.id) ? `<span class="cleared-mark">✓ #${GOAL} をマージ済み</span>` : "";
  const count = found > 0 ? `<span>異変 ${found} / ${allAnomalies(l.problems).length}</span>` : "";
  const status = cleared || count ? `<span class="level-status">${cleared}${count}</span>` : "";
  return `
    <button class="level" type="button" data-level="${l.id}">
      ${head}
      ${status}
    </button>`;
}

function renderCollection(l: PlayableLevel): string {
  const found = loadDiscovered(l.id);
  const foundCount = countFound(l.problems, found);
  // 図鑑は異変を 1 つ見つけてから表示する
  if (foundCount === 0) return "";
  const groups = [
    ...l.problems.baselines.map((b) => ({ heading: b.pullRequest.title, anomalies: b.anomalies })),
    { heading: "どのプルリクエストにも", anomalies: l.problems.commonAnomalies },
  ];
  const sections = groups
    .map(({ heading, anomalies }) => {
      const items = anomalies
        .map((a) =>
          found.has(a.id) ? `<li class="found">${escapeHtml(a.name)}</li>` : `<li class="unknown">？？？</li>`,
        )
        .join("");
      return `<h3>${escapeHtml(heading)}</h3><ul>${items}</ul>`;
    })
    .join("");
  return `
    <details class="collection">
      <summary>見つけた異変（${escapeHtml(l.name)}） ${foundCount} / ${allAnomalies(l.problems).length}</summary>
      ${sections}
    </details>`;
}

function startGame(next: PlayableLevel): void {
  level = next;
  state = newGame(level.problems, random);
  discovered = loadDiscovered(level.id);
  foundThisRun = new Set();
  saveProgress({ level, state, foundThisRun });
  void transition(
    "レビュー依頼が届きました",
    "codebot[bot] があなたをレビュアーに指定しました",
    renderRound,
  );
}

function renderTitle(): void {
  app.innerHTML = `
    <div class="title-screen">
      <div class="title-inner">
        <p class="title-repo">acme / admin-console</p>
        <h1 class="game-title">プルリクエスト <span class="game-title-number">#8</span></h1>
        <p class="tagline">AI が書いたプルリクエストを、説明文だけでレビューしてください。</p>
        <h2 class="level-heading">難易度を選んでレビューを始める</h2>
        <div class="levels">${levels.map(renderLevelButton).join("")}</div>
        ${levels.filter(isPlayable).map(renderCollection).join("")}
        <p class="title-footer">${reportLink("title-report", "不具合の報告は GitHub へ")}</p>
      </div>
    </div>`;

  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-level]")) {
    button.addEventListener("click", () => {
      const chosen = findLevel(button.dataset.level!);
      if (chosen && isPlayable(chosen)) startGame(chosen);
    });
  }
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
      <div class="actions">
        <button class="btn danger" type="button" data-verdict="request-changes">変更をリクエスト</button>
        <button class="btn primary" type="button" data-verdict="approve">承認</button>
      </div>
    </section>`;
}

function renderPullRequest(pr: PullRequest, number: number): string {
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
      <span class="level-badge">${escapeHtml(level.name)}</span>
      <button class="topbar-back" type="button" id="back-to-title">難易度を選び直す</button>
      ${reportLink("topbar-report", "不具合を報告")}
    </header>
    <main class="page">
      <aside class="notice" role="note">
        <p class="notice-title">ご案内</p>
        <ol>${notice}</ol>
      </aside>

      ${state.missed ? `<p class="missed"><button class="missed-link" type="button" id="show-missed">#${state.missed.number} の答え合わせをする</button></p>` : ""}

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
                <span class="avatar avatar-inline">${robotAvatar}</span>
                <b>${escapeHtml(pr.author)}</b> <span class="bot-badge">bot</span>
                <span class="muted">がコメント · ${escapeHtml(pr.openedAgo)}</span>
              </div>
              <div class="markdown-body">${renderMarkdown(pr.body)}</div>
            </div>
          </article>
          <ul class="timeline">${timeline}</ul>
          ${renderChecks(pr)}
          ${renderReviewBox()}
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
  app.innerHTML = renderPullRequest(pullRequestFor(state.problems, round), round.number);
  window.scrollTo({ top: 0 });

  for (const tab of app.querySelectorAll("[data-locked]")) {
    tab.addEventListener("click", () => toast("このゲームでは説明文しか読めません。"));
  }
  for (const button of app.querySelectorAll<HTMLButtonElement>("[data-verdict]")) {
    button.addEventListener("click", () => void review(button.dataset.verdict as Verdict));
  }
  const { missed } = state;
  if (missed) app.querySelector("#show-missed")!.addEventListener("click", () => showAnswer(missed));
  app.querySelector("#back-to-title")!.addEventListener("click", backToTitle);
}

/** レビューをやめてタイトルへ戻る。#1 より先に進んでいたら、進捗が消えることを確かめる */
function backToTitle(): void {
  if (busy) return;
  const { number } = state.round;
  if (number > START && !confirm(`#${number} まで進んだ進捗は失われます。タイトルへ戻って難易度を選び直しますか？`)) {
    return;
  }
  renderTitle();
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- 答え合わせ

const answerDialog = document.createElement("dialog");
answerDialog.className = "answer";
document.body.append(answerDialog);
// 枠の外（背景）をクリックしても閉じる
answerDialog.addEventListener("click", (event) => {
  if (event.target === answerDialog) answerDialog.close();
});

/** 判断を間違えたラウンドで、届いたプルリクエストのどこに異変があったかを見せる（見つけた異変には数えない） */
function showAnswer(round: Round): void {
  const { problems } = state;
  const normal = normalPullRequestFor(problems, round);
  const anomaly = allAnomalies(problems).find((a) => a.id === round.anomalyId);
  let content: string;
  if (anomaly) {
    const fields = markAnomaly(normal, pullRequestFor(problems, round))
      .map(({ label, lines }) => {
        const rows = lines
          .map((line) =>
            line === null
              ? `<li class="answer-gap">…</li>`
              : `<li${line.marked ? ` class="answer-mark"` : ""}>${escapeHtml(line.text) || "&nbsp;"}</li>`,
          )
          .join("");
        return `<h3>${escapeHtml(label)}</h3><ul class="answer-lines">${rows}</ul>`;
      })
      .join("");
    content = `
      <p class="answer-verdict">異変がありました: <b>${escapeHtml(anomaly.name)}</b></p>
      <p>変更をリクエストするべきでした。プルリクエストの次のところに気づくべきでした。</p>
      ${fields}
      <p class="muted">答え合わせで見た異変は、見つけた異変には数えられません。</p>`;
  } else {
    content = `
      <p class="answer-verdict">異変はありませんでした</p>
      <p>いつもどおりのプルリクエストだったので、承認するべきでした。</p>`;
  }
  answerDialog.innerHTML = `
    <h2>#${round.number} の答え合わせ</h2>
    <p class="answer-title">${escapeHtml(normal.title)}</p>
    ${content}
    <form method="dialog"><button class="btn" type="submit">閉じる</button></form>`;
  answerDialog.showModal();
  answerDialog.scrollTop = 0;
}

async function review(verdict: Verdict): Promise<void> {
  if (busy) return;
  const { anomalyId } = state.round;
  const result = submitReview(state, verdict, random);
  if (result.correct && anomalyId !== null) {
    foundThisRun.add(anomalyId);
    discovered.add(anomalyId);
    saveDiscovered(level.id, discovered);
  }
  state = result.state;
  // 演出の途中で再読み込みされても、判断した結果から続ける
  saveProgress({ level, state, foundThisRun });
  if (state.cleared) {
    saveCleared(level.id);
    await transition("承認しました", "codebot[bot] がプルリクエストをマージしています…", renderEnding);
    return;
  }
  await transition(
    verdict === "approve" ? "承認しました" : "変更をリクエストしました",
    "codebot[bot] が新しいプルリクエストを作成しています…",
    renderRound,
  );
}

// ---------------------------------------------------------------- エンディング

function renderEnding(): void {
  const anomalies = allAnomalies(level.problems);
  const { mergedMessage } = findBaseline(level.problems, state.round.baselineId);
  const found = anomalies.filter((a) => foundThisRun.has(a.id));
  const totalFound = countFound(level.problems, discovered);
  const list =
    found.length > 0
      ? `<ul class="found-list">${found.map((a) => `<li>${escapeHtml(a.name)}</li>`).join("")}</ul>`
      : `<p class="muted">（異変はひとつも見つかりませんでした）</p>`;
  const shareText = clearShareText({
    levelName: level.name,
    reviews: state.reviews,
    mistakes: state.mistakes,
    found: totalFound,
    totalAnomalies: anomalies.length,
  });

  app.innerHTML = `
    <div class="title-screen ending">
      <div class="title-inner">
        <p class="merged-badge">マージ済み</p>
        <h1 class="game-title">プルリクエスト <span class="game-title-number">#${GOAL}</span></h1>
        <p class="tagline">${escapeHtml(mergedMessage)}</p>
        <dl class="stats">
          <div><dt>難易度</dt><dd>${escapeHtml(level.name)}</dd></div>
          <div><dt>レビュー回数</dt><dd>${state.reviews}</dd></div>
          <div><dt>判断ミス</dt><dd>${state.mistakes}</dd></div>
          ${totalFound > 0 ? `<div><dt>見つけた異変（累計）</dt><dd>${totalFound} / ${anomalies.length}</dd></div>` : ""}
        </dl>
        <h2 class="found-heading">今回見つけた異変</h2>
        ${list}
        <div class="ending-actions">
          <a class="btn big share-x" href="${escapeHtml(xShareUrl(shareText))}" target="_blank" rel="noopener noreferrer">${xLogo}でシェア</a>
          <button class="btn big" id="back" type="button">タイトルへ戻る</button>
        </div>
      </div>
    </div>`;
  app.querySelector("#back")!.addEventListener("click", () => {
    clearProgress();
    renderTitle();
  });
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

/** 再読み込みされる前のプレイがあれば、その続きの画面を出す */
function resume(): boolean {
  const progress = loadProgress();
  if (!progress) return false;
  ({ level, state, foundThisRun } = progress);
  discovered = loadDiscovered(level.id);
  if (state.cleared) renderEnding();
  else renderRound();
  return true;
}

if (!resume()) renderTitle();
