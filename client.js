/**
 * dsh-theme-picker — 客户端半（Client half）。
 *
 * 一个手写的 CJS bundle，按 DSH 客户端的 module-loader 约定包装：
 *   window.__ModuleLoader__.load({ id, factory })
 * factory 里写普通 CommonJS，导出 `inject` 与 `apply(ctx)`。
 *
 * 做三件事：
 *  1. 把主题面板注册成 **右侧栏页签**（走 dsh-better-sidebar 的公开服务
 *     `ctx.betterSidebar.registerTab`；软依赖，没装该插件时自动跳过）；
 *  2. 同时在设置页注册「主题」分区（同屏兜底，也是没有 better-sidebar 时的落点）；
 *  3. 面板内容：原生主题（theme 服务，即时切换）+ 已装主题插件
 *     （dsh-market 同源 HTTP 路由，单主题独享、可禁用/卸载）。
 *
 * 设计约束：软依赖一律用 ctx.get(服务名) + ctx.on("internal/service") 重挂，
 * 让插件安装顺序与 HMR 都不影响结果；所有资源在 apply 内用 ctx.effect 注册。
 */
window.__ModuleLoader__.load({
  id: "dsh-theme-picker",
  factory(require) {
    const React = require("react");
    const h = React.createElement;

    /** 右侧栏页签类型 id（也是 `SidebarTab.type`，会写进 better-sidebar 的持久化状态）。 */
    const TAB_ID = "dsh-theme-picker:themes";
    /** 语言命名空间。 */
    const NS = "themePicker";
    /** 本插件样式表标记。 */
    const CSS_TAG = "dsh-theme-picker/theme-picker.css";
    /** 主题插件清单的轮询间隔（仅在面板可见时跑）。 */
    const POLL_MS = 8000;

    const zh = {
      title: "主题",
      tabDesc: "切换主题、管理已装的主题插件",
      desc: "同一时间只有一个主题在画面上生效。点「显示」切过去，其余自动隐藏。",
      nativeTitle: "内置与原生主题",
      pluginsTitle: "已装主题插件",
      system: "跟随系统",
      light: "浅色",
      dark: "深色",
      active: "使用中",
      disabled: "已禁用",
      unknown: "未激活",
      pending: "待重启",
      enable: "启用",
      disable: "禁用",
      uninstall: "卸载",
      refresh: "刷新",
      loading: "加载中…",
      none: "没有检测到已装的主题插件。",
      switching: "处理中…",
      switched: "已切换到「{name}」。主题插件切换后需刷新页面生效。",
      disabledOk: "已禁用「{name}」。",
      uninstalledOk: "已卸载「{name}」，刷新页面后生效。",
      uninstallConfirm: "确定卸载主题插件「{name}」吗？",
      marketError: "主题插件：",
      nativeError: "切换主题失败：",
      reload: "立即刷新",
      noMarket: "未检测到 dsh-market，插件清单不可用。",
      multiActive: "{count} 个主题插件同时在生效：{names}",
      keepOnly: "只保留「{name}」",
      exclusiveFailed: "仍有其他主题在生效：{names}。请刷新页面或重启 DSH 后再试。",
      basePalette: "底层配色",
      skinOverrides: "有主题插件正在生效，它覆盖这里的配色。",
      softHidden: "已启用·不外显",
      show: "显示",
      hide: "隐藏",
      softOff: "已隐藏「{name}」，插件保持启用。",
      softFailed: "「{name}」的软开关没有响应。",
      // 统一语义：每行只有「显示 / 隐藏」两个动作、两个状态词，不暴露底层差异。
      openState: "使用中",
      closedState: "未显示",
      shown: "已显示「{name}」。",
      hidden: "已隐藏「{name}」。",
      shownReload: "已显示「{name}」，刷新页面后彻底生效。",
      hiddenReload: "已隐藏「{name}」，刷新页面后彻底生效。",
      softHint: "插件保持启用，只关外观",
    };
    const en = {
      title: "Themes",
      tabDesc: "Switch themes and manage installed theme plugins",
      desc: "Only one theme is visible at a time. Press Show to switch; the rest hide automatically.",
      nativeTitle: "Built-in and native themes",
      pluginsTitle: "Installed theme plugins",
      system: "Follow system",
      light: "Light",
      dark: "Dark",
      active: "In use",
      disabled: "Disabled",
      unknown: "Not active",
      pending: "Needs restart",
      enable: "Enable",
      disable: "Disable",
      uninstall: "Uninstall",
      refresh: "Refresh",
      loading: "Loading…",
      none: "No installed theme plugins found.",
      switching: "Working…",
      switched: 'Switched to "{name}". A theme plugin needs a page refresh to apply.',
      disabledOk: 'Disabled "{name}".',
      uninstalledOk: 'Uninstalled "{name}"; refresh the page to apply.',
      uninstallConfirm: 'Uninstall theme plugin "{name}"?',
      marketError: "Theme plugins: ",
      nativeError: "Could not switch theme: ",
      reload: "Reload now",
      noMarket: "dsh-market is not installed; the plugin list is unavailable.",
      multiActive: "{count} theme plugins are active at once: {names}",
      keepOnly: 'Keep only "{name}"',
      exclusiveFailed: "Other themes are still active: {names}. Refresh the page or restart DSH, then retry.",
      basePalette: "Base palette",
      skinOverrides: "A theme plugin is active and overrides the palette below.",
      softHidden: "Enabled, hidden",
      show: "Show",
      hide: "Hide",
      softOff: 'Hid "{name}"; the plugin stays enabled.',
      softFailed: '"{name}" did not answer its soft switch.',
      openState: "In use",
      closedState: "Hidden",
      shown: 'Showing "{name}".',
      hidden: 'Hid "{name}".',
      shownReload: 'Showing "{name}"; refresh the page to apply it fully.',
      hiddenReload: 'Hid "{name}"; refresh the page to apply it fully.',
      softHint: "Plugin stays enabled; only its look is off",
    };

    const CSS = `
.tpk{display:flex;flex-direction:column;gap:12px;padding:12px 12px 18px;box-sizing:border-box;font-size:12.5px;line-height:1.5;color:var(--dsw-alias-label-primary)}
.tpk-head{display:flex;align-items:center;gap:8px}
.tpk-head h2{margin:0;flex:1 1 auto;font-size:13px;font-weight:600}
.tpk-btn{font:inherit;font-size:11.5px;padding:4px 10px;border-radius:8px;border:1px solid var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:transparent;cursor:pointer;white-space:nowrap}
.tpk-btn:hover{opacity:.85}
.tpk-btn:disabled{opacity:.45;cursor:default}
.tpk-btn.danger{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.tpk-sec{display:flex;flex-direction:column;gap:6px}
.tpk-sec-t{margin:0 0 2px;font-size:11px;letter-spacing:1px;color:var(--dsw-alias-label-secondary)}
.tpk-row{display:flex;align-items:flex-start;gap:9px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;transition:border-color .15s ease}
.tpk-row:hover{border-color:var(--dsw-alias-border-l2)}
.tpk-row.on{border-color:var(--dsw-alias-brand-primary)}
.tpk-dot{flex:none;width:12px;height:12px;margin-top:2px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);box-sizing:border-box}
.tpk-row.on .tpk-dot{border-color:var(--dsw-alias-brand-primary);background:radial-gradient(circle,var(--dsw-alias-brand-primary) 0 44%,transparent 56%)}
.tpk-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.tpk-name{font-weight:600;overflow-wrap:anywhere}
.tpk-sub{font-size:11px;line-height:1.45;color:var(--dsw-alias-label-secondary)}
.tpk-tag{flex:none;padding:2px 7px;border-radius:999px;border:1px solid transparent;font-size:10.5px;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.tpk-tag.on{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.tpk-tag.off{border-color:var(--dsw-alias-border-l1)}
.tpk-tag.warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.tpk-acts{display:flex;gap:6px;margin-top:6px}
.tpk-note{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-state-success-primary);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.tpk-note span{flex:1 1 auto;min-width:0}
.tpk-alert{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-state-warn-primary);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.tpk-alert span{flex:1 1 auto;min-width:0;line-height:1.45}
.tpk-err{font-size:11.5px;line-height:1.45;color:var(--dsw-alias-state-error-primary)}
.tpk-muted{font-size:11.5px;line-height:1.45;color:var(--dsw-alias-label-secondary)}
.tpk-empty{padding:2px 0;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.tpk-page{box-sizing:border-box;max-width:560px;padding:0 4px 16px}
`;

    // ── 小工具 ────────────────────────────────────────────────────────────

    function messageOf(error) {
      return error && typeof error.message === "string" ? error.message : String(error);
    }

    function fill(template, params) {
      let text = String(template);
      if (params) {
        for (const key of Object.keys(params)) {
          text = text.split("{" + key + "}").join(String(params[key]));
        }
      }
      return text;
    }

    /** 建立翻译函数；locale 服务缺失时退回内置中文。 */
    function createTranslator(ctx) {
      const locale = ctx.get("locale");
      if (locale === undefined || typeof locale.register !== "function" || typeof locale.bind !== "function") {
        return (key, params) => fill(zh[key] === undefined ? key : zh[key], params);
      }
      const offZh = locale.register(NS, "zh", zh);
      const offEn = locale.register(NS, "en", en);
      const bound = locale.bind(NS);
      const translate = (key, params) => {
        const raw = bound(key);
        const text = typeof raw === "string" && raw !== "" ? raw : (zh[key] === undefined ? key : zh[key]);
        return fill(text, params);
      };
      translate.dispose = () => {
        if (typeof offZh === "function") offZh();
        if (typeof offEn === "function") offEn();
      };
      return translate;
    }

    // ── dsh-market 同源 HTTP 路由 ─────────────────────────────────────────

    async function marketGet(path) {
      const res = await fetch(path, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!res.ok) throw new Error("market GET " + path + " -> " + res.status);
      return res.json();
    }

    async function marketPost(path, body) {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body === undefined ? {} : body),
      });
      let data = null;
      try {
        data = await res.json();
      } catch (error) {
        data = null;
      }
      if (!res.ok || data === null || typeof data !== "object" || data.ok !== true) {
        const detail =
          data && typeof data.error === "string"
            ? data.error
            : data && typeof data.reason === "string"
              ? data.reason
              : "market POST " + path + " -> " + res.status;
        throw new Error(detail);
      }
      return data;
    }

    // ── 「软关闭」适配器 ─────────────────────────────────────────────────
    //
    // 皮肤的外显来自它自己的客户端半：注入样式 + 给 body 挂开关属性。
    // 停用插件 = 销毁 fiber，这正是昔涟主题崩溃竞态的触发点，而且重挂要整页刷新。
    // 有些皮肤自己带「关掉外观但保持启用」的开关，就优先走它：
    //   dsh-cyrene-theme：GET/POST /cyrene/state（带 rev 乐观锁），字段 theme，
    //   DOM 开关 body[data-cyrene-skin="on"|"off"]，它所有 CSS 都挂在这个属性下。
    // 没有适配器的皮肤只能退回 loader 开关（那是唯一通用的档位）。
    const SOFT_ADAPTERS = {
      "dsh-cyrene-theme": { route: "/cyrene/state", field: "theme", attr: "data-cyrene-skin" },
    };

    /** 读一份软开关状态；不可用返回 null（不猜）。 */
    async function readSoftState(adapter) {
      try {
        const res = await fetch(adapter.route, { headers: { accept: "application/json" }, cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        if (data === null || typeof data !== "object" || data.ok !== true) return null;
        if (typeof data.value !== "object" || data.value === null) return null;
        return data.value;
      } catch (error_) {
        return null;
      }
    }

    /** 设置软开关：先读 rev，再带 rev 写；成功后就地切 body 属性，避免等它下次 resync。 */
    async function setSoftState(adapter, on) {
      const value = await readSoftState(adapter);
      if (value === null || !Number.isInteger(value.rev)) return false;
      try {
        const res = await fetch(adapter.route, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rev: value.rev, [adapter.field]: on }),
        });
        let data = null;
        try {
          data = await res.json();
        } catch (error_) {
          data = null;
        }
        // 409 = 别处刚改过（rev 变了），交给下一轮轮询自愈，这里不重试。
        if (!res.ok || data === null || typeof data !== "object" || data.ok !== true) return false;
      } catch (error_) {
        return false;
      }
      try {
        if (typeof document !== "undefined" && document.body) {
          document.body.setAttribute(adapter.attr, on ? "on" : "off");
        }
      } catch (error_) {
        /* 只落到持久化，下次 resync 生效 */
      }
      return true;
    }

    function repoOf(url) {
      if (typeof url !== "string") return null;
      const match = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(url);
      return match === null ? null : match[1];
    }

    function repoFromSpec(spec) {
      if (typeof spec !== "string") return null;
      const lower = spec.toLowerCase();
      let match = /(?:^|[^a-z])github:([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?(?:[#\s].*)?$/.exec(lower);
      if (match !== null) return match[1];
      match = /github\.com[/:]([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?(?:[#\s].*)?$/.exec(lower);
      return match === null ? null : match[1];
    }

    let classifyPromise = null;

    /** 从 market 注册表里算出「哪些名字 / 仓库属于主题」。失败也缓存，避免每分钟打一次。 */
    function classifyThemes() {
      if (classifyPromise !== null) return classifyPromise;
      classifyPromise = (async () => {
        try {
          const data = await marketGet("/dsh-market/registry");
          const names = new Set();
          const repos = new Set();
          const byName = new Map();
          const byRepo = new Map();
          const plugins = data && data.registry && Array.isArray(data.registry.plugins) ? data.registry.plugins : [];
          for (const plugin of plugins) {
            const categories = Array.isArray(plugin.category) ? plugin.category : [plugin.category];
            if (categories.indexOf("theme") === -1) continue;
            const description = {};
            if (plugin.description !== null && typeof plugin.description === "object") {
              if (typeof plugin.description.zh === "string") description.zh = plugin.description.zh;
              if (typeof plugin.description.en === "string") description.en = plugin.description.en;
            } else if (typeof plugin.description === "string") {
              description.zh = plugin.description;
              description.en = plugin.description;
            }
            const meta = { name: typeof plugin.name === "string" ? plugin.name : "", description };
            if (typeof plugin.name === "string" && plugin.name !== "") {
              names.add(plugin.name);
              if (!byName.has(plugin.name)) byName.set(plugin.name, meta);
            }
            if (typeof plugin.npm === "string" && plugin.npm !== "") {
              names.add(plugin.npm);
              if (!byName.has(plugin.npm)) byName.set(plugin.npm, meta);
            }
            const repo = repoOf(plugin.url);
            if (repo !== null) {
              const key = repo.toLowerCase();
              repos.add(key);
              if (!byRepo.has(key)) byRepo.set(key, meta);
            }
          }
          return { names, repos, byName, byRepo, failed: false };
        } catch (error) {
          return { names: new Set(), repos: new Set(), byName: new Map(), byRepo: new Map(), failed: true };
        }
      })();
      return classifyPromise;
    }

    /** 已装插件 → 主题插件列表。activation/disabled/live 语义沿用 dsh-market 1.29+。 */
    async function listThemePlugins() {
      const errors = [];
      const classify = await classifyThemes();
      if (classify.failed) errors.push("registry unavailable");
      let installedData = null;
      try {
        installedData = await marketGet("/dsh-market/installed");
      } catch (error) {
        errors.push(messageOf(error));
        return { themes: [], errors, market: false };
      }
      const isTheme = (name, spec) => {
        // 本插件自身不是主题，必须排除。
        if (name === "dsh-theme-picker") return false;
        if (classify.names.has(name)) return true;
        const repo = repoFromSpec(spec);
        if (repo !== null && classify.repos.has(repo)) return true;
        // 兜底：本地/私有安装的皮肤不在注册表里，spec 也提不出仓库，只能按名字归类。
        const lower = String(name).toLowerCase();
        return lower.indexOf("skin") !== -1 || lower.indexOf("theme") !== -1;
      };
      const installed =
        installedData && typeof installedData.installed === "object" && installedData.installed !== null
          ? installedData.installed
          : {};
      const disabled = Array.isArray(installedData.disabled) ? installedData.disabled : [];
      const activation =
        installedData.activation && typeof installedData.activation === "object" && installedData.activation !== null
          ? installedData.activation
          : {};
      const liveNames = Array.isArray(installedData.live) ? installedData.live : [];
      const themes = [];
      for (const name of Object.keys(installed)) {
        if (!isTheme(name, installed[name])) continue;
        const act = activation[name];
        const isDisabled =
          disabled.indexOf(name) !== -1 ||
          (act !== null && act !== undefined && act.state === "disabled");
        const live =
          !isDisabled &&
          ((act !== null && act !== undefined && act.state === "live") || liveNames.indexOf(name) !== -1);
        let meta = classify.byName.get(name);
        if (meta === undefined) {
          const repo = repoFromSpec(installed[name]);
          if (repo !== null) meta = classify.byRepo.get(repo);
        }
        let displayName = "";
        let description = null;
        if (meta !== undefined) {
          displayName = String(meta.name).split("#")[0];
          const hasZh = typeof meta.description.zh === "string";
          const hasEn = typeof meta.description.en === "string";
          if (hasZh || hasEn) {
            description = { zh: hasZh ? meta.description.zh : null, en: hasEn ? meta.description.en : null };
          }
        }
        if (displayName === "") {
          displayName = name.indexOf("@") === 0 && name.indexOf("/") !== -1 ? name.slice(name.indexOf("/") + 1) : name;
        }
        themes.push({
          name,
          displayName,
          description,
          disabled: isDisabled,
          live,
          state: act && typeof act.state === "string" ? act.state : "unknown",
        });
      }
      themes.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0));
      // 软开关：只有「已启用 + 有适配器」的主题才值得问一次；读不到就当作未知（按外显处理）。
      for (const item of themes) {
        const adapter = SOFT_ADAPTERS[item.name];
        item.soft = adapter !== undefined;
        item.softEnabled = null;
        if (adapter === undefined || item.live !== true) continue;
        const value = await readSoftState(adapter);
        if (value !== null && typeof value[adapter.field] === "boolean") item.softEnabled = value[adapter.field];
        // visual＝真的在画面上生效。软关闭的主题插件没在画面上，不参与「多主题」判定。
        item.visual = item.live && item.softEnabled !== false;
      }
      for (const item of themes) {
        if (item.visual === undefined) item.visual = item.live;
      }
      return { themes, errors, market: true };
    }

    // ── React hooks ──────────────────────────────────────────────────────

    /** 订阅原生主题快照（theme 服务缺失时返回 null）。 */
    function useThemeSnapshot(ctx, service) {
      const [snapshot, setSnapshot] = React.useState(() =>
        service === undefined || service === null ? null : service.getTheme(),
      );
      React.useEffect(() => {
        if (service === undefined || service === null) return undefined;
        setSnapshot(service.getTheme());
        const disposer = ctx.on("theme/change", () => setSnapshot(service.getTheme()));
        return typeof disposer === "function" ? disposer : undefined;
      }, [ctx, service]);
      return snapshot;
    }

    /** 语言切换时强制重渲染（文案由 t 在渲染期取，不需要缓存文本）。 */
    function useLocaleTicks(ctx) {
      const locale = ctx.get("locale");
      const [, bump] = React.useState(0);
      React.useEffect(() => {
        if (locale === undefined || typeof locale.subscribe !== "function") return undefined;
        const disposer = locale.subscribe(() => bump((value) => value + 1));
        return typeof disposer === "function" ? disposer : undefined;
      }, [locale]);
    }

    // ── 组件 ─────────────────────────────────────────────────────────────

    function Row(props) {
      const { on, title, subtitle, meta, tag, tagClass, tagTitle, onClick } = props;
      return h(
        "div",
        {
          className: "tpk-row" + (on ? " on" : ""),
          onClick: typeof onClick === "function" ? onClick : undefined,
          style: typeof onClick === "function" ? null : { cursor: "default" },
        },
        h("span", { className: "tpk-dot" }),
        h(
          "div",
          { className: "tpk-main" },
          h("div", { className: "tpk-name" }, title),
          subtitle ? h("div", { className: "tpk-sub", title: subtitle }, subtitle) : null,
          meta ? h("div", { className: "tpk-sub" }, meta) : null,
        ),
        tag ? h("span", { className: "tpk-tag " + (tagClass || ""), title: tagTitle || undefined }, tag) : null,
      );
    }

    function Icon(props) {
      const size = typeof props.size === "number" ? props.size : 16;
      return h(
        "svg",
        { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, style: { display: "block" } },
        h("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", "stroke-width": 1.6 }),
        h("circle", { cx: 12, cy: 12, r: 3.2, fill: "currentColor" }),
        h("circle", { cx: 12, cy: 4.6, r: 1.7, fill: "currentColor", opacity: 0.55 }),
        h("circle", { cx: 18.6, cy: 15.4, r: 1.5, fill: "currentColor", opacity: 0.55 }),
        h("circle", { cx: 5.4, cy: 15.4, r: 1.5, fill: "currentColor", opacity: 0.55 }),
      );
    }

    function ThemeManager(props) {
      const { ctx, t, visible } = props;
      useLocaleTicks(ctx);
      const themeService = ctx.get("theme");
      const snapshot = useThemeSnapshot(ctx, themeService);

      const [market, setMarket] = React.useState(null);
      const [marketError, setMarketError] = React.useState(null);
      const [loading, setLoading] = React.useState(false);
      const [busy, setBusy] = React.useState(null);
      const [notice, setNotice] = React.useState(null);
      const [error, setError] = React.useState(null);
      const inflight = React.useRef(false);

      const refresh = React.useCallback(async () => {
        if (inflight.current) return;
        inflight.current = true;
        setLoading(true);
        try {
          const result = await listThemePlugins();
          setMarket(result.themes);
          setMarketError(
            result.errors.length === 0
              ? null
              : (result.market ? t("marketError") : t("noMarket")) + result.errors.join("; "),
          );
        } catch (error_) {
          setMarket([]);
          setMarketError(t("marketError") + messageOf(error_));
        } finally {
          inflight.current = false;
          setLoading(false);
        }
      }, [t]);

      React.useEffect(() => {
        if (visible === false) return undefined;
        refresh();
        const timer = window.setInterval(refresh, POLL_MS);
        return () => window.clearInterval(timer);
      }, [visible, refresh]);

      const pickNative = (id) => {
        if (themeService === undefined || themeService === null) return;
        try {
          themeService.setTheme(id);
          setError(null);
        } catch (error_) {
          setError(t("nativeError") + messageOf(error_));
        }
      };

      /**
       * 把除 keep 之外「正在画面上生效」的主题全部收掉。
       *
       * 两种收法：
       *  - 有软开关适配器（如昔涟）：只关外观，插件保持启用 → 不动 fiber，
       *    不触发重挂，也不需要整页刷新；
       *  - 没有适配器：退回 market 的 loader 开关（唯一通用档位）。
       * 另外 market 只对注册表分类内的主题做排他，名单外的皮肤必须本地补刀。
       */
      const hideOtherThemes = async (keepName) => {
        const listed = await listThemePlugins();
        const others = listed.themes.filter((item) => item.visual === true && item.name !== keepName);
        const stuck = [];
        let loaderChanged = false;
        for (const other of others) {
          const adapter = SOFT_ADAPTERS[other.name];
          if (adapter !== undefined && (await setSoftState(adapter, false))) continue;
          try {
            await marketPost("/dsh-market/toggle", { name: other.name, enabled: false });
            loaderChanged = true;
          } catch (error_) {
            stuck.push(other.displayName || other.name);
          }
        }
        return { stuck, loaderChanged };
      };

      /** 点亮一个主题：已启用的软主题只开外观，其余走 loader 开关。 */
      const lightUpTheme = async (item) => {
        const adapter = SOFT_ADAPTERS[item.name];
        if (item.live === true && adapter !== undefined) {
          if (!(await setSoftState(adapter, true))) throw new Error(t("softFailed", { name: item.displayName || item.name }));
          return false; // 没动 loader，不需要刷新
        }
        await marketPost("/dsh-market/toggle", { name: item.name, enabled: true });
        if (adapter !== undefined) await setSoftState(adapter, true);
        return true;
      };

      /** 收掉一个主题：软主题只关外观，其余停用插件。 */
      const dimTheme = async (item) => {
        const adapter = SOFT_ADAPTERS[item.name];
        if (adapter !== undefined && item.live === true) {
          if (!(await setSoftState(adapter, false))) throw new Error(t("softFailed", { name: item.displayName || item.name }));
          return false;
        }
        await marketPost("/dsh-market/toggle", { name: item.name, enabled: false });
        return true;
      };

      const applyTheme = async (item, on) => {
        const name = item.name;
        setBusy(name);
        setNotice(null);
        setMarketError(null);
        setError(null);
        try {
          if (on) {
            const loaderChanged = await lightUpTheme(item);
            const { stuck, loaderChanged: othersChanged } = await hideOtherThemes(name);
            const after = await listThemePlugins();
            const stillOn = after.themes.filter((entry) => entry.visual === true && entry.name !== name);
            const leftovers = stuck.concat(stillOn.map((entry) => entry.displayName || entry.name));
            if (leftovers.length > 0) {
              throw new Error(t("exclusiveFailed", { names: leftovers.join("、") }));
            }
            const needsReload = loaderChanged || othersChanged;
            setNotice({
              text: needsReload ? t("shownReload", { name }) : t("shown", { name }),
              reload: needsReload,
            });
          } else {
            const loaderChanged = await dimTheme(item);
            setNotice({
              text: loaderChanged ? t("hiddenReload", { name }) : t("hidden", { name }),
              reload: loaderChanged,
            });
          }
        } catch (error_) {
          setMarketError(t("marketError") + messageOf(error_));
        } finally {
          setBusy(null);
          refresh();
        }
      };

      /** 发现多个主题同时生效时，一键收敛到其中一个。 */
      const convergeToOne = async (keepName, keepItem) => {
        setBusy(keepName);
        setNotice(null);
        setMarketError(null);
        setError(null);
        try {
          if (keepItem !== undefined && keepItem.live === true && SOFT_ADAPTERS[keepName] !== undefined) {
            await setSoftState(SOFT_ADAPTERS[keepName], true);
          }
          const { stuck, loaderChanged } = await hideOtherThemes(keepName);
          const after = await listThemePlugins();
          const stillOn = after.themes.filter((entry) => entry.visual === true && entry.name !== keepName);
          const leftovers = stuck.concat(stillOn.map((entry) => entry.displayName || entry.name));
          if (leftovers.length > 0) {
            throw new Error(t("exclusiveFailed", { names: leftovers.join("、") }));
          }
          setNotice({ text: t("keepOnly", { name: keepName }), reload: loaderChanged });
        } catch (error_) {
          setMarketError(t("marketError") + messageOf(error_));
        } finally {
          setBusy(null);
          refresh();
        }
      };

      const uninstallPlugin = async (name) => {
        if (typeof window !== "undefined" && typeof window.confirm === "function") {
          if (!window.confirm(t("uninstallConfirm", { name }))) return;
        }
        setBusy(name);
        setNotice(null);
        setMarketError(null);
        try {
          await marketPost("/dsh-market/uninstall", { name });
          setNotice({ text: t("uninstalledOk", { name }), reload: true });
        } catch (error_) {
          setMarketError(t("marketError") + messageOf(error_));
        } finally {
          setBusy(null);
          refresh();
        }
      };

      const reloadPage = () => {
        try {
          if (typeof location !== "undefined" && location !== null && typeof location.reload === "function") {
            location.reload();
            return;
          }
        } catch (error_) {
          /* 落到下面的提示 */
        }
        setNotice({ text: t("desc"), reload: false });
      };

      const preference = snapshot === null ? null : snapshot.preference;
      const definitions = snapshot !== null && Array.isArray(snapshot.themes) ? snapshot.themes : [];
      const extraThemes = definitions.filter(
        (definition) => definition && definition.id !== "light" && definition.id !== "dark",
      );
      const nativeRows = [
        { id: "system", label: t("system") },
        { id: "light", label: t("light") },
        { id: "dark", label: t("dark") },
      ].concat(extraThemes.map((definition) => ({ id: definition.id, label: definition.id })));

      const localeZh =
        typeof window !== "undefined" &&
        window.localStorage !== undefined &&
        window.localStorage !== null &&
        window.localStorage.getItem("dsh.locale") === "zh";
      const describe = (item) => {
        if (item.description === null || item.description === undefined) return null;
        return localeZh
          ? item.description.zh || item.description.en || null
          : item.description.en || item.description.zh || null;
      };

      // 同一时间只应有一个主题插件在画面上生效；多于一个就是需要收敛的状态。
      const liveList = market === null ? [] : market.filter((item) => item.visual === true);
      const keeper = liveList.length > 1 ? liveList[0] : null;
      const skinLive = liveList.length > 0;
      const displayOf = (item) => item.displayName || item.name;
      const namesOf = (items) => items.map(displayOf).join("、");

      return h(
        "div",
        { className: "tpk" },
        h(
          "div",
          { className: "tpk-head" },
          h("h2", null, t("title")),
          h(
            "button",
            { type: "button", className: "tpk-btn", disabled: loading === true, onClick: () => refresh() },
            t("refresh"),
          ),
        ),
        h("div", { className: "tpk-muted" }, t("desc")),
        notice
          ? h(
              "div",
              { className: "tpk-note" },
              h("span", null, notice.text),
              notice.reload ? h("button", { type: "button", className: "tpk-btn", onClick: reloadPage }, t("reload")) : null,
            )
          : null,
        keeper !== null
          ? h(
              "div",
              { className: "tpk-alert" },
              h("span", null, t("multiActive", { count: liveList.length, names: namesOf(liveList) })),
              h(
                "button",
                {
                  type: "button",
                  className: "tpk-btn",
                  disabled: busy === keeper.name,
                  onClick: () => convergeToOne(keeper.name, keeper),
                },
                t("keepOnly", { name: displayOf(keeper) }),
              ),
            )
          : null,
        h(
          "div",
          { className: "tpk-sec" },
          h("p", { className: "tpk-sec-t" }, t("nativeTitle")),
          skinLive ? h("div", { className: "tpk-muted" }, t("skinOverrides")) : null,
          snapshot === null
            ? h("div", { className: "tpk-empty" }, t("loading"))
            : nativeRows.map((row) =>
                h(Row, {
                  key: "native:" + row.id,
                  on: preference === row.id,
                  title: row.label,
                  tag: preference === row.id ? (skinLive ? t("basePalette") : t("active")) : null,
                  tagClass: skinLive ? "off" : "on",
                  onClick: () => pickNative(row.id),
                }),
              ),
        ),
        h(
          "div",
          { className: "tpk-sec" },
          h("p", { className: "tpk-sec-t" }, t("pluginsTitle")),
          market === null && loading ? h("div", { className: "tpk-empty" }, t("loading")) : null,
          market !== null && market.length === 0 ? h("div", { className: "tpk-empty" }, t("none")) : null,
          market !== null
            ? market.map((item) => {
                const isBusy = busy === item.name;
                const restarting = item.visual !== true && item.state === "restart";
                const tag = item.visual ? t("openState") : restarting ? t("pending") : t("closedState");
                const tagClass = item.visual ? "on" : restarting ? "warn" : "off";
                const tagTitle = item.soft === true ? t("softHint") : undefined;
                const actionLabel = item.visual ? t("hide") : t("show");
                return h(
                  "div",
                  { key: "market:" + item.name, "data-item": item.name },
                  h(Row, {
                    on: item.visual,
                    title: item.displayName || item.name,
                    subtitle: describe(item),
                    meta: item.name,
                    tag,
                    tagClass,
                    tagTitle,
                    onClick: null,
                  }),
                  h(
                    "div",
                    { className: "tpk-acts" },
                    h(
                      "button",
                      {
                        type: "button",
                        className: "tpk-btn",
                        title: actionLabel + " · " + item.name,
                        disabled: isBusy,
                        onClick: () => applyTheme(item, item.visual !== true),
                      },
                      isBusy ? t("switching") : actionLabel,
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        className: "tpk-btn danger",
                        disabled: isBusy,
                        onClick: () => uninstallPlugin(item.name),
                      },
                      t("uninstall"),
                    ),
                  ),
                );
              })
            : null,
        ),
        error ? h("div", { className: "tpk-err" }, error) : null,
        marketError ? h("div", { className: "tpk-err" }, marketError) : null,
      );
    }

    function SettingsPage(props) {
      return h("div", { className: "tpk-page" }, h(ThemeManager, props));
    }

    // ── 插件装配 ─────────────────────────────────────────────────────────

    return {
      inject: ["slots"],
      apply(ctx) {
        // 1. 样式表：随插件生命周期挂载/卸载。
        ctx.effect(() => {
          if (typeof document === "undefined") return undefined;
          const existing = document.querySelector('style[data-plugin-css="' + CSS_TAG + '"]');
          if (existing !== null) return undefined;
          const tag = document.createElement("style");
          tag.dataset.plugin = "dsh-theme-picker";
          tag.dataset.pluginCss = CSS_TAG;
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => {
            if (tag.parentNode !== null) tag.parentNode.removeChild(tag);
          };
        });

        // 2. 语言：注册中英词条，拿到本插件的翻译函数。
        const t = createTranslator(ctx);
        ctx.effect(() => () => {
          if (typeof t.dispose === "function") t.dispose();
        });

        // 3. 右侧栏页签：better-sidebar 是软依赖，装了才注册，卸了自动撤销。
        const TabPanel = (props) => h(ThemeManager, { ctx, t, visible: props.visible !== false });
        ctx.effect(() => {
          let current = null;
          const reconcile = () => {
            const service = ctx.get("betterSidebar");
            if (current !== null && current.service === service) return;
            if (current !== null) {
              current.dispose();
              current = null;
            }
            if (service === undefined || service === null || typeof service.registerTab !== "function") return;
            try {
              const dispose = service.registerTab({
                id: TAB_ID,
                title: () => t("title"),
                description: () => t("tabDesc"),
                icon: (size) => h(Icon, { size }),
                order: 60,
                single: true,
                component: TabPanel,
              });
              current = { service, dispose: typeof dispose === "function" ? dispose : () => {} };
            } catch (error_) {
              console.error("[dsh-theme-picker] registerTab failed", error_);
              current = null;
            }
          };
          reconcile();
          const off = ctx.on("internal/service", (name) => {
            if (name === "betterSidebar") reconcile();
          });
          return () => {
            if (typeof off === "function") off();
            if (current !== null) {
              current.dispose();
              current = null;
            }
          };
        });

        // 4. 设置页分区：没有 better-sidebar 时的落点，也是更宽的同屏入口。
        const PagePanel = (props) => h(SettingsPage, { ctx, t, visible: props && props.visible !== false });
        ctx.effect(() =>
          ctx.slots.inject("settings.section", () =>
            ctx.slots.register(
              {
                name: "settings.section",
                id: "theme-picker",
                order: 26,
                label: () => t("title"),
              },
              PagePanel,
            ),
          ),
        );
      },
    };
  },
});
