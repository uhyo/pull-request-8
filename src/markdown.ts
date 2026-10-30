/**
 * プルリクエストの説明文を表示するための最小限の Markdown レンダラー。
 * 見出し・段落・箇条書き・タスクリスト・インラインコード・Issue 参照だけに対応する。
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  return text
    .split(/(`[^`]+`)/)
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      return escapeHtml(part).replace(/#(\d+)/g, '<span class="issue-ref">#$1</span>');
    })
    .join("");
}

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; items: { text: string; checked: boolean | null }[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const line of source.split("\n")) {
    const heading = /^(#{1,6}) (.*)$/.exec(line);
    const item = /^- (?:\[( |x)\] )?(.*)$/.exec(line);
    if (line.trim() === "") {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2]! });
    } else if (item) {
      if (current?.kind !== "list") {
        flush();
        current = { kind: "list", items: [] };
      }
      const mark = item[1];
      current.items.push({ text: item[2]!, checked: mark === undefined ? null : mark === "x" });
    } else {
      if (current?.kind !== "paragraph") {
        flush();
        current = { kind: "paragraph", lines: [] };
      }
      current.lines.push(line);
    }
  }
  flush();
  return blocks;
}

export function renderMarkdown(source: string): string {
  return parse(source)
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
        case "paragraph":
          return `<p>${block.lines.map(renderInline).join("<br>")}</p>`;
        case "list": {
          const isTaskList = block.items.some((i) => i.checked !== null);
          const items = block.items
            .map((i) => {
              const box =
                i.checked === null
                  ? ""
                  : `<input type="checkbox" disabled${i.checked ? " checked" : ""}> `;
              return `<li>${box}${renderInline(i.text)}</li>`;
            })
            .join("");
          return `<ul${isTaskList ? ' class="task-list"' : ""}>${items}</ul>`;
        }
      }
    })
    .join("\n");
}
