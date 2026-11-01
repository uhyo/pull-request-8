// ogp/ogp.html を 1200×630 で撮影して public/ogp.png に書き出す。
// Playwright が必要: npm i --no-save playwright && npx playwright install chromium
// 実行: node ogp/render.cjs
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto("file://" + path.join(__dirname, "ogp.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, "..", "public", "ogp.png");
  await page.screenshot({ path: out });
  await browser.close();
  console.log("wrote " + path.relative(process.cwd(), out));
})();
