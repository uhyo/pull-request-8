const DISCOVERED_KEY = "pr8:discovered";
const CLEARED_KEY = "pr8:cleared";

// ストレージが使えない環境（プライベートウィンドウなど）でもゲーム自体は遊べるようにする

export function loadDiscovered(): Set<string> {
  try {
    const raw = localStorage.getItem(DISCOVERED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveDiscovered(ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(DISCOVERED_KEY, JSON.stringify([...ids]));
  } catch {
    // 保存できなくても続行する
  }
}

export function loadCleared(): boolean {
  try {
    return localStorage.getItem(CLEARED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveCleared(): void {
  try {
    localStorage.setItem(CLEARED_KEY, "1");
  } catch {
    // 保存できなくても続行する
  }
}
