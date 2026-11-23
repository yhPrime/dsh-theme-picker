/**
 * 写通道避让回归：marketPost 撞上 409-busy 时轮询 /dsh-market/status，
 * 空闲后自动重试；一直忙就按预算超时收场；非 busy 的错误照旧原样抛。
 *
 *   node test/busy-retry.mjs
 *
 * 起因（2026-11-23 实测）：market 页里排了一条 drain 更新等 agent 空闲期间，
 * 主题面板点「显示/隐藏」撞上 409，把英文锁错误原文甩到了面板上。
 */
import { readFile } from "node:fs/promises";

let passed = 0;
const failures = [];
function ok(label, condition, extra) {
  if (condition === true) {
    passed += 1;
    console.log("  ok   " + label);
    return;
  }
  failures.push(label);
  console.log("  FAIL " + label + (extra === undefined ? "" : "  → " + JSON.stringify(extra)));
}

// 从真实源码里抠出写通道避让这一段（常量 + sleep + marketLaneFree + marketPost）。
// 思路与 verify-skin-gate.mjs 的 extractCss 一致：不复制正文，改了源码这里跟着变。
const source = await readFile(new URL("../client.js", import.meta.url), "utf8");
const start = source.indexOf("const BUSY_POLL_MS");
const end = source.indexOf("// ── 「软关闭」适配器");
if (start === -1 || end === -1 || end < start) {
  throw new Error("client.js 里找不到写通道避让段（BUSY_POLL_MS … marketPost）");
}
const build = new Function(source.slice(start, end) + "\nreturn { marketPost };");
const { marketPost } = build();

// fetch 桩：按编排顺序吐响应，逐条记录请求。
const log = [];
const responses = [];
globalThis.fetch = async (url, options) => {
  const path = String(url);
  const method = options !== undefined && options.method === "POST" ? "POST" : "GET";
  log.push(method + " " + path);
  const next = responses.shift();
  if (next === undefined) throw new Error("测试脚本之外多出一条请求: " + method + " " + path);
  return { ok: next.status >= 200 && next.status < 300, status: next.status, json: async () => next.json };
};

// 秒表拨快：sleep 立即返回。等待预算按轮数（BUSY_POLL_MAX）计，测试不真睡。
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn) => {
  fn();
  return 0;
};

const posts = () => log.filter((entry) => entry.startsWith("POST"));
const statuses = () => log.filter((entry) => entry === "GET /dsh-market/status");

// 1) 撞上 409-busy → 轮询 status（busy、drainActive 各占一拍）→ 空闲 → 重试成功。
responses.push(
  { status: 409, json: { ok: false, busy: true, error: "another plugin operation is running" } },
  { status: 200, json: { busy: true, drainActive: false } },
  { status: 200, json: { busy: false, drainActive: true } },
  { status: 200, json: { busy: false, drainActive: false } },
  { status: 200, json: { ok: true, name: "demo" } },
);
const first = await marketPost("/dsh-market/toggle", { name: "demo", enabled: true });
ok("busy 后等空闲并重试成功", first !== null && first.ok === true, first);
ok("重试前轮询三次 status（busy 与 drainActive 各挡一拍）", statuses().length === 3, log);
ok("一共只发了两次 POST", posts().length === 2, log);

// 2) 一直忙 → 按预算超时：不再发第二条 POST，报的是双语文案。
log.length = 0;
responses.length = 0;
responses.push({ status: 409, json: { ok: false, busy: true, error: "another plugin operation is running" } });
for (let i = 0; i < 60; i += 1) responses.push({ status: 200, json: { busy: true, drainActive: false } });
let timeoutMessage = null;
try {
  await marketPost("/dsh-market/uninstall", { name: "demo" });
} catch (error) {
  timeoutMessage = error.message;
}
ok("一直忙时按预算超时抛错", timeoutMessage !== null, timeoutMessage);
ok(
  "超时文案是可读的双语提示（不是英文锁错误原文）",
  typeof timeoutMessage === "string" && timeoutMessage.includes("市场正忙") && timeoutMessage.includes("market page"),
  timeoutMessage,
);
ok("超时前只发过一条 POST", posts().length === 1, log);
ok("等待预算封顶（不无限轮询）", statuses().length === 45, statuses().length);

// 3) 非 busy 的错误照旧透传原文（回归保护）。
log.length = 0;
responses.length = 0;
responses.push({ status: 400, json: { ok: false, error: "plugin is not installed" } });
let detail = null;
try {
  await marketPost("/dsh-market/toggle", { name: "demo", enabled: true });
} catch (error) {
  detail = error.message;
}
ok("400 错误原样抛", detail === "plugin is not installed", detail);

log.length = 0;
responses.length = 0;
responses.push({ status: 409, json: { ok: false, error: "restart already scheduled" } });
detail = null;
try {
  await marketPost("/dsh-market/toggle", { name: "demo", enabled: true });
} catch (error) {
  detail = error.message;
}
ok("不带 busy 的 409 原样抛（只对真 busy 避让）", detail === "restart already scheduled", detail);

// 4) 空闲时一次成功：只发一条 POST、不碰 status。
log.length = 0;
responses.length = 0;
responses.push({ status: 200, json: { ok: true, name: "demo" } });
const direct = await marketPost("/dsh-market/toggle", { name: "demo", enabled: false });
ok("空闲时一次成功且不轮询 status", direct !== null && direct.ok === true && log.length === 1, log);

globalThis.setTimeout = realSetTimeout;

console.log("");
if (failures.length === 0) {
  console.log("PASS  " + passed + "/" + passed);
  process.exitCode = 0;
} else {
  console.log("FAIL  " + passed + " passed, " + failures.length + " failed");
  process.exitCode = 1;
}
