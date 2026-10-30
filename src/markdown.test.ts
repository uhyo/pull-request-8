import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings, paragraphs, lists and task lists", () => {
    const html = renderMarkdown("## 見出し\n\n一行目\n二行目\n\n- a\n- b\n\n- [x] done\n- [ ] todo");
    expect(html).toBe(
      [
        "<h2>見出し</h2>",
        "<p>一行目<br>二行目</p>",
        "<ul><li>a</li><li>b</li></ul>",
        '<ul class="task-list"><li><input type="checkbox" disabled checked> done</li><li><input type="checkbox" disabled> todo</li></ul>',
      ].join("\n"),
    );
  });

  it("renders inline code and issue references", () => {
    expect(renderMarkdown("`#1` と #42")).toBe('<p><code>#1</code> と <span class="issue-ref">#42</span></p>');
  });

  it("escapes HTML", () => {
    expect(renderMarkdown("<script>alert(1)</script> `<b>`")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt; <code>&lt;b&gt;</code></p>",
    );
  });
});
