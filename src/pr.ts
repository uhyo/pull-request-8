export type CheckStatus = "success" | "failure" | "skipped";

export interface Check {
  name: string;
  status: CheckStatus;
}

export interface PullRequest {
  title: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  openedAgo: string;
  labels: string[];
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  checks: Check[];
  /** 説明文の下に並ぶタイムラインのイベント */
  timeline: string[];
  /** リポジトリに掲示されている「ご案内」 */
  notice: string[];
  /** プルリクエストの説明文（Markdown） */
  body: string;
}

export function clonePullRequest(pr: PullRequest): PullRequest {
  return structuredClone(pr);
}
