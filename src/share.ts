/** 公開しているゲームの URL。シェアした投稿からここに来てもらう */
export const gameUrl = "https://uhyo.github.io/pull-request-8/";

export interface ClearResult {
  levelName: string;
  reviews: number;
  mistakes: number;
  /** その難易度で見つけた異変（累計）。まだ 1 つもなければ書かない */
  found: number;
  totalAnomalies: number;
}

/** クリアしたときに X に投稿する文章。これから遊ぶ人のために、異変の中身は書かない */
export function clearShareText({ levelName, reviews, mistakes, found, totalAnomalies }: ClearResult): string {
  const stats = [`レビュー ${reviews} 回`, `判断ミス ${mistakes} 回`];
  if (found > 0) stats.push(`見つけた異変 ${found} / ${totalAnomalies}`);
  return `「プルリクエスト #8」を${levelName}でクリアしました！\n${stats.join("・")}`;
}

/** X の投稿画面を開く URL */
export function xShareUrl(text: string, url: string = gameUrl): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
