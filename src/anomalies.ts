import { clonePullRequest, type PullRequest } from "./pr";

export interface Anomaly {
  id: string;
  /** 図鑑に表示される名前（発見するまで伏せられる） */
  name: string;
  apply(pr: PullRequest): PullRequest;
}

/** `text` 中にちょうど 1 回現れる `from` を `to` に置き換える。 */
export function replaceOnce(text: string, from: string, to: string): string {
  const index = text.indexOf(from);
  if (index === -1 || text.indexOf(from, index + 1) !== -1) {
    throw new Error(`"${from}" must appear exactly once`);
  }
  return text.slice(0, index) + to + text.slice(index + from.length);
}

export function bodyEdit(id: string, name: string, from: string, to: string): Anomaly {
  return {
    id,
    name,
    apply(pr) {
      const next = clonePullRequest(pr);
      next.body = replaceOnce(next.body, from, to);
      return next;
    },
  };
}

/** 説明文全体を書き換える異変 */
export function bodyRewrite(id: string, name: string, rewrite: (body: string) => string): Anomaly {
  return {
    id,
    name,
    apply(pr) {
      const next = clonePullRequest(pr);
      next.body = rewrite(next.body);
      return next;
    },
  };
}

export function metaEdit(
  id: string,
  name: string,
  edit: (pr: PullRequest) => void,
): Anomaly {
  return {
    id,
    name,
    apply(pr) {
      const next = clonePullRequest(pr);
      edit(next);
      return next;
    },
  };
}

export function swapSections(body: string, a: string, b: string): string {
  const sections = body.split(/(?=^## )/m);
  const ia = sections.findIndex((s) => s.startsWith(`## ${a}`));
  const ib = sections.findIndex((s) => s.startsWith(`## ${b}`));
  const sa = sections[ia];
  const sb = sections[ib];
  if (sa === undefined || sb === undefined) {
    throw new Error(`sections "${a}" and "${b}" must exist`);
  }
  sections[ia] = sb;
  sections[ib] = sa;
  return sections.join("");
}
