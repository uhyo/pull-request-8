import type { LevelId } from "./levels";

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
