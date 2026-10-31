import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newGame, submitReview } from "./game";
import { findLevel, isPlayable, type PlayableLevel } from "./levels";
import { clearProgress, loadProgress, saveCleared, saveProgress } from "./storage";

/** テスト用の Storage（中身は Map に入れる） */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

const level = findLevel("easy") as PlayableLevel;

describe("progress", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("sessionStorage", memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves the progress in the session storage only", () => {
    expect(isPlayable(level)).toBe(true);
    const state = submitReview(newGame(level.problems, () => 0), "approve", () => 0).state;
    const foundThisRun = new Set(["x"]);
    saveProgress({ level, state, foundThisRun });
    expect(loadProgress()).toEqual({ level, state, foundThisRun });
    expect(localStorage.length).toBe(0);

    // 見つけた異変やクリアは今までどおりローカルストレージに保存する
    saveCleared(level.id);
    expect(localStorage.length).toBe(1);
    expect(sessionStorage.length).toBe(1);
  });

  it("forgets the progress after going back to the title", () => {
    saveProgress({ level, state: newGame(level.problems, () => 0), foundThisRun: new Set() });
    clearProgress();
    expect(loadProgress()).toBeNull();
  });

  it("ignores broken progress", () => {
    sessionStorage.setItem("pr8:progress", "{");
    expect(loadProgress()).toBeNull();
    sessionStorage.setItem("pr8:progress", JSON.stringify({ level: "unknown", game: {}, foundThisRun: [] }));
    expect(loadProgress()).toBeNull();
  });

  it("keeps the game playable when the session storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(() => saveProgress({ level, state: newGame(level.problems, () => 0), foundThisRun: new Set() })).not.toThrow();
    expect(loadProgress()).toBeNull();
    expect(() => clearProgress()).not.toThrow();
  });
});
