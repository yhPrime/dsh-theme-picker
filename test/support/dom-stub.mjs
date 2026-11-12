/**
 * 最小 DOM / 模块加载器 / ctx 桩：够把 `client.js` 装配起来（apply），
 * 用来验样式表注入、关闭态 CSS 内容与卸载清理。不渲染 React 组件。
 */

import { readFile } from "node:fs/promises";

const CLIENT = new URL("../../client.js", import.meta.url);

class El {
  constructor(tag) {
    this.tagName = tag;
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.textContent = "";
    this.attrs = {};
  }

  setAttribute(name, value) {
    this.attrs[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    child.parentNode = null;
    return child;
  }
}

function makeDocument() {
  const head = new El("head");
  const body = new El("body");
  const matches = (el, selector) => {
    const hit = /^style\[data-plugin-css="([^"]+)"\]$/.exec(selector);
    if (hit === null) return false;
    return el.tagName === "style" && el.dataset.pluginCss !== undefined && el.dataset.pluginCss === hit[1];
  };
  return {
    head,
    body,
    createElement: (tag) => new El(tag),
    querySelector(selector) {
      return head.children.find((el) => matches(el, selector)) ?? null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
  };
}

/** 只做装配需要的 React 表面；组件不会被渲染，所以 hooks 都是空实现。 */
function makeReact() {
  return {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (initial) => [initial, () => {}],
    useEffect: () => {},
    useCallback: (fn) => fn,
    useRef: (value) => ({ current: value }),
    useSyncExternalStore: () => undefined,
  };
}

function makeCtx() {
  const disposers = [];
  const registrations = [];
  const ctx = {
    effect(fn) {
      const dispose = fn();
      if (typeof dispose === "function") disposers.push(dispose);
    },
    on() {
      return () => {};
    },
    get() {
      return undefined;
    },
    slots: {
      registrations,
      inject(name, callback) {
        const dispose = callback();
        return () => { if (typeof dispose === "function") dispose(); };
      },
      register(registration, component) {
        const record = { registration, component };
        registrations.push(record);
        return () => {
          const index = registrations.indexOf(record);
          if (index !== -1) registrations.splice(index, 1);
        };
      },
    },
  };
  return {
    ctx,
    registrations,
    disposeAll() {
      while (disposers.length > 0) {
        const dispose = disposers.pop();
        try {
          dispose();
        } catch {
          /* 卸载清理不该抛 */
        }
      }
    },
  };
}

/**
 * 载入 bundle 并返回一个已 apply 的实例。
 * @returns {Promise<{document: object, exports: object, styleTags: () => object[], disposeAll: () => void, applyAgain: () => void}>}
 */
export async function bootstrap(options = {}) {
  const document = makeDocument();
  let spec = null;
  globalThis.window = {
    __ModuleLoader__: { load(captured) { spec = captured; } },
    addEventListener() {},
    removeEventListener() {},
  };
  const mutationObservers = [];
  globalThis.MutationObserver = class {
    constructor(callback) { this.callback = callback; this.observing = false; }
    observe() { this.observing = true; mutationObservers.push(this); }
    disconnect() { this.observing = false; }
  };
  globalThis.document = document;
  globalThis.fetch = async () => {
    throw new Error("fetch 不应在装配阶段被调用");
  };

  const source = await readFile(CLIENT, "utf8");
  (0, eval)(source);
  if (spec === null) throw new Error("bundle 没有调用 window.__ModuleLoader__.load");

  const react = makeReact();
  const primitives = {
    FISH_LOGO_PATH: "M0 0L1 1L2 0Z",
    FISH_LOGO_VIEWBOX: { width: 24, height: 18 },
  };
  const exports = spec.factory((name) => {
    if (name === "react") return react;
    if (name === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
    throw new Error("unexpected require(" + name + ")");
  });
  const { ctx, registrations, disposeAll } = makeCtx();
  const instance = {
    document,
    exports,
    styleTags: () => document.head.children.filter((el) => el.tagName === "style"),
    disposeAll,
    registrations,
    primitives,
    apply: () => exports.apply(ctx),
    applyAgain: () => exports.apply(ctx),
    fireMutations: () => { for (const observer of mutationObservers) if (observer.observing) observer.callback([]); },
  };
  if (options.apply !== false) instance.apply();
  return instance;
}
