/**
 * 装配冒烟：样式表注入、关闭态 CSS 内容、去重与卸载清理。
 *
 *   node test/smoke.mjs
 */
import { bootstrap } from "./support/dom-stub.mjs";

const PANEL_TAG = "dsh-theme-picker/theme-picker.css";
const SKIN_TAG = "dsh-theme-picker/skin-closed.css";

let passed = 0;
const failures = [];
function ok(label, condition, extra) {
  if (condition) {
    passed += 1;
    console.log("  ok   " + label);
    return;
  }
  failures.push(label);
  console.log("  FAIL " + label + (extra === undefined ? "" : "  → " + JSON.stringify(extra)));
}

function byTag(document, tag) {
  return document.head.children.filter((el) => el.tagName === "style" && el.dataset.pluginCss === tag);
}

const app = await bootstrap();
const skinCss = byTag(app.document, SKIN_TAG)[0]?.textContent ?? "";

ok("面板样式表注入一份", byTag(app.document, PANEL_TAG).length === 1);
ok("关闭态样式表注入一份", byTag(app.document, SKIN_TAG).length === 1);
ok("两份样式表带插件标记", app.styleTags().every((el) => el.dataset.plugin === "dsh-theme-picker"));
ok("关闭态规则至少三组都挂在「皮肤不是 on」下", (skinCss.match(/:not\(\[data-cyrene-skin="on"\]\)/g) ?? []).length >= 3, skinCss.slice(0, 80));
ok("皮肤关时整行收掉", skinCss.includes(".cyre-hero{display:none !important}"));
ok("恢复 pointer-events / user-select", skinCss.includes("pointer-events:revert !important") && skinCss.includes("user-select:revert !important"));
ok("恢复宿主文案、徽标（display:revert）", skinCss.includes("display:revert !important"));
ok("关闭态 CSS 里没有模板插值残留", !skinCss.includes("${"));
ok("关闭态 CSS 大括号收支平衡", (skinCss.match(/\{/g) ?? []).length === (skinCss.match(/\}/g) ?? []).length);
ok("样式表带 data-plugin-css 标记（可被去重与清理）", app.styleTags().every((el) => typeof el.dataset.pluginCss === "string"));

app.applyAgain();
ok("重复 apply 不重复注入", app.styleTags().length === 2, app.styleTags().map((el) => el.dataset.pluginCss));

app.disposeAll();
ok("卸载后两份样式表都被清掉", app.document.head.children.length === 0, app.document.head.children.length);

// 已存在同名样式时不再注入第二份（HMR / 双实例保护）。
const second = await bootstrap({ apply: false });
const existing = second.document.createElement("style");
existing.dataset.plugin = "dsh-theme-picker";
existing.dataset.pluginCss = SKIN_TAG;
existing.textContent = "/* pre-existing */";
second.document.head.appendChild(existing);
second.apply();
ok("页面上已有同名关闭态样式时不重复注入", byTag(second.document, SKIN_TAG).length === 1, byTag(second.document, SKIN_TAG).length);
ok("已有同名样式时不去覆盖它", byTag(second.document, SKIN_TAG)[0].textContent === "/* pre-existing */");
second.disposeAll();

console.log("");
if (failures.length === 0) {
  console.log("PASS  " + passed + "/" + passed);
  process.exitCode = 0;
} else {
  console.log("FAIL  " + passed + " passed, " + failures.length + " failed");
  process.exitCode = 1;
}
