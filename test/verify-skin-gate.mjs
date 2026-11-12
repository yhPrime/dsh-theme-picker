/**
 * 真实浏览器验算：把「管理器注入的关闭态 CSS」套到仿真欢迎页上，叠加
 * **主题原始 CSS**（默认读已安装的 cyrene，可用 --cyrene= 指定备份里的原版），
 * 比较皮肤 on / off / 无属性三种状态。
 *
 *   node test/verify-skin-gate.mjs
 *   node test/verify-skin-gate.mjs --cyrene=D:/path/to/client.js
 *
 * 依赖本机 Chrome 与 profile 内的 puppeteer-core；不做网络访问。
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { bootstrap } from "./support/dom-stub.mjs";

const HERE = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FIXTURE = join(HERE, "fixture-hero.html");
const SHOT = join(HERE, "screenshots");
const CHROME = "C:/Users/trailblazer/AppData/Local/Google/Chrome/Application/chrome.exe";
const DEFAULT_CYRENE = "C:/Users/trailblazer/.dsh/profiles/desktop/node_modules/dsh-cyrene-theme/lib/client.js";
const PROFILE_PACKAGE = "C:/Users/trailblazer/.dsh/profiles/desktop/package.json";
const SKIN_TAG = "dsh-theme-picker/skin-closed.css";

const cyrenePath = (process.argv.find((arg) => arg.startsWith("--cyrene=")) ?? "").slice("--cyrene=".length) || DEFAULT_CYRENE;

function extractCss(text, marker) {
  const start = text.indexOf(marker);
  if (start === -1) throw new Error("找不到 " + marker);
  const at = start + marker.length;
  const end = text.indexOf("`;", at);
  if (end === -1) throw new Error(marker + " 没有收尾");
  const css = text.slice(at, end).replace(/\$\{PLACEHOLDER_TEXT\}/g, "有问题？有任务？来找昔涟♪");
  if (css.includes("${")) throw new Error(marker + " 里还有插值残留");
  return css;
}

const checks = [];
const ok = (label, condition, extra) => checks.push({ label, pass: condition === true, extra: extra === undefined ? "" : JSON.stringify(extra) });

// 1) 从真实装配路径里取管理器注入的关闭态 CSS（不是从源码里抄正则）。
const app = await bootstrap();
const pickerCss = app.styleTags().find((el) => el.dataset.pluginCss === SKIN_TAG)?.textContent ?? "";
ok("装配后确实注入了关闭态样式表", pickerCss !== "");
ok("关闭态规则至少三组都挂在「皮肤不是 on」下", (pickerCss.match(/:not\(\[data-cyrene-skin="on"\]\)/g) ?? []).length >= 3);
ok("皮肤关时整行收掉", pickerCss.includes(".cyre-hero{display:none !important}"));
ok("恢复 pointer-events / user-select", pickerCss.includes("pointer-events:revert !important") && pickerCss.includes("user-select:revert !important"));
ok("恢复宿主文案与徽标", pickerCss.includes("display:revert !important"));
app.disposeAll();

// 2) 主题侧：默认取已安装版本（回滚后即原版），也可显式指定原版备份。
const cyreneSource = await readFile(cyrenePath, "utf8");
const cyreneCss = extractCss(cyreneSource, "const CSS = `");

const requireFromProfile = createRequire(PROFILE_PACKAGE);
const puppeteer = requireFromProfile("puppeteer-core");
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  userDataDir: join(SHOT, "chrome-profile"),
  args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions", "--allow-file-access-from-files", "--disable-gpu"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 600, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(FIXTURE).href);
  await page.evaluate((cyrene, picker) => {
    const theme = document.createElement("style");
    theme.id = "cyrene";
    theme.textContent = cyrene;
    document.head.appendChild(theme);
    const gate = document.createElement("style");
    gate.id = "picker";
    gate.textContent = picker;
    document.head.appendChild(gate);
  }, cyreneCss, pickerCss);

  const measure = (skin) => page.evaluate((state) => {
    const body = document.body;
    if (state === "on" || state === "off") body.setAttribute("data-dsh-cyrene", "");
    else body.removeAttribute("data-dsh-cyrene");
    if (state === "on" || state === "off") body.setAttribute("data-cyrene-skin", state);
    else body.removeAttribute("data-cyrene-skin");
    const box = (selector) => {
      const el = document.querySelector(selector);
      if (el === null) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        display: style.display,
        visibility: style.visibility,
        pointerEvents: style.pointerEvents,
        userSelect: style.userSelect,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    return {
      hero: box(".cyre-hero"),
      hostTitle: box("#host-title"),
      legacyText: box("#legacy-text"),
      badge: box("#badge"),
      headline: box("#headline"),
    };
  }, skin);

  const visible = (item) => item !== null && item.display !== "none" && item.visibility !== "hidden" && item.width > 0 && item.height > 0;
  const hidden = (item) => item === null || item.display === "none" || item.visibility === "hidden" || (item.width === 0 && item.height === 0);

  const off = await measure("off");
  await page.screenshot({ path: join(SHOT, "skin-off.png") });
  ok("皮肤关：昔涟立绘/艺术字整行不显示", hidden(off.hero), off.hero);
  ok("皮肤关：宿主「探索未至之境」回来", visible(off.hostTitle), off.hostTitle);
  ok("皮肤关：旧构建的 _headlineText 也回来", visible(off.legacyText), off.legacyText);
  ok("皮肤关：「预览版」徽标回来", visible(off.badge), off.badge);
  ok("皮肤关：整行恢复可交互（pointer-events）", off.headline !== null && off.headline.pointerEvents !== "none", off.headline?.pointerEvents);
  ok("皮肤关：整行恢复可选字（user-select）", off.headline !== null && off.headline.userSelect !== "none", off.headline?.userSelect);

  const on = await measure("on");
  await page.screenshot({ path: join(SHOT, "skin-on.png") });
  ok("皮肤开：昔涟立绘/艺术字显示", visible(on.hero), on.hero);
  ok("皮肤开：宿主文案被藏（两种落点都覆盖）", hidden(on.hostTitle) && hidden(on.legacyText), { host: on.hostTitle, legacy: on.legacyText });
  ok("皮肤开：「预览版」徽标被收掉", hidden(on.badge), on.badge);
  ok("皮肤开：整行不接指针", on.headline !== null && on.headline.pointerEvents === "none", on.headline?.pointerEvents);

  const none = await measure("none");
  await page.screenshot({ path: join(SHOT, "skin-none.png") });
  ok("还没戴皮肤（无 cyrene 属性）：管理器样式完全惰性，昔涟照常显示", visible(none.hero), none.hero);

  const back = await measure("off");
  await page.screenshot({ path: join(SHOT, "skin-back-off.png") });
  ok("开 → 关来回切之后仍是「宿主文案在、昔涟不在」", visible(back.hostTitle) && hidden(back.hero), { host: back.hostTitle, hero: back.hero });
} finally {
  await browser.close();
}

let failed = 0;
for (const check of checks) {
  if (!check.pass) failed += 1;
  console.log((check.pass ? "  ok   " : "  FAIL ") + check.label + (check.pass ? "" : "  → " + check.extra));
}
console.log("");
console.log((failed === 0 ? "PASS" : "FAIL") + "  " + (checks.length - failed) + "/" + checks.length + "   (cyrene: " + cyrenePath + ")");
process.exitCode = failed === 0 ? 0 : 1;
