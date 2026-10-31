import { restoreGame, saveGame, type GameState } from "./game";
import { findLevel, isPlayable, type LevelId, type PlayableLevel } from "./levels";

function storageKey(level: LevelId, name: "discovered" | "cleared"): string {
  return `pr8:${level}:${name}`;
}

// ストレージが使えない環境（プライベートウィンドウなど）でもゲーム自体は遊べるようにする

export function loadDiscovered(level: LevelId): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(level, "discovered"));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveDiscovered(level: LevelId, ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(storageKey(level, "discovered"), JSON.stringify([...ids]));
  } catch {
    // 保存できなくても続行する
  }
}

export function loadCleared(level: LevelId): boolean {
  try {
    return localStorage.getItem(storageKey(level, "cleared")) === "1";
  } catch {
    return false;
  }
}

export function saveCleared(level: LevelId): void {
  try {
    localStorage.setItem(storageKey(level, "cleared"), "1");
  } catch {
    // 保存できなくても続行する
  }
}

// プレイ中の進行はタブを閉じるまでだけ覚えておく（スマホでページが再読み込みされても続きから遊べるように）

const progressKey = "pr8:progress";

export interface Progress {
  level: PlayableLevel;
  state: GameState;
  /** 今回のプレイで見つけた異変 */
  foundThisRun: Set<string>;
}

export function loadProgress(): Progress | null {
  try {
    const raw = sessionStorage.getItem(progressKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return null;
    const { level: levelId, game, foundThisRun } = parsed as Record<string, unknown>;
    const level = typeof levelId === "string" ? findLevel(levelId) : undefined;
    if (!level || !isPlayable(level) || !Array.isArray(foundThisRun)) return null;
    const state = restoreGame(level.problems, game);
    if (!state) return null;
    return { level, state, foundThisRun: new Set(foundThisRun.filter((x) => typeof x === "string")) };
  } catch {
    return null;
  }
}

export function saveProgress({ level, state, foundThisRun }: Progress): void {
  try {
    const saved = { level: level.id, game: saveGame(state), foundThisRun: [...foundThisRun] };
    sessionStorage.setItem(progressKey, JSON.stringify(saved));
  } catch {
    // 保存できなくても続行する
  }
}

export function clearProgress(): void {
  try {
    sessionStorage.removeItem(progressKey);
  } catch {
    // 消せなくても続行する
  }
}
