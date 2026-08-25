window.__ModuleLoader__.load({
  id: "dsh-theme-picker",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    const NS = "themes.picker";

    const zh = {
      title: "主题",
      desc: "选择一个主题。同一时间只有一个主题生效，切换后其余主题自动禁用。",
      plugin: "插件",
      light: "浅色",
      dark: "深色",
      active: "使用中",
      inactive: "已禁用",
      enable: "启用",
      errorPrefix: "切换失败：",
      pluginsTitle: "已安装的主题插件",
      refresh: "刷新",
      loading: "加载中…",
      none: "没有检测到已安装的主题插件。",
      pending: "待重启",
      unknownState: "未激活",
      switching: "切换中…",
      switchedOk: "已切换主题「{name}」，其他主题已自动禁用。刷新页面后新皮肤生效。",
      reloadNow: "立即刷新",
      reloadFallback: "请手动刷新页面（F5）以应用新皮肤。",
      marketErrorPrefix: "主题插件：",
      uninstall: "卸载",
      uninstallConfirm: "确定卸载主题插件「{name}」吗？卸载后需刷新页面生效。",
      uninstalledOk: "已卸载「{name}」。",
      disable: "禁用",
      disabledOk: "已禁用「{name}」。",
      disableGuide: "当前服务端不支持单独禁用主题，请启用另一个主题以替换当前主题。",
    };
    const en = {
      title: "Themes",
      desc: "Pick a theme. Only one theme can be active at a time — switching disables the others.",
      plugin: "Plugin",
      light: "Light",
      dark: "Dark",
      active: "In use",
      inactive: "Disabled",
      enable: "Enable",
      errorPrefix: "Switch failed: ",
      pluginsTitle: "Installed theme plugins",
      refresh: "Refresh",
      loading: "Loading…",
      none: "No installed theme plugins found.",
      pending: "Needs restart",
      unknownState: "Inactive",
      switching: "Switching…",
      switchedOk: 'Switched to theme "{name}"; other themes were disabled automatically. Refresh the page to apply the new skin.',
      reloadNow: "Reload now",
      reloadFallback: "Please refresh the page (F5) to apply the new skin.",
      marketErrorPrefix: "Theme plugins: ",
      uninstall: "Uninstall",
      uninstallConfirm: 'Uninstall theme plugin "{name}"? A page refresh is needed after uninstalling.',
      uninstalledOk: 'Uninstalled "{name}".',
      disable: "Disable",
      disabledOk: 'Disabled "{name}".',
      disableGuide: "This server does not support disabling a theme by itself; enable another theme to replace it.",
    };

    const CSS = `
.tp-wrap{display:flex;flex-direction:column;gap:10px;padding:2px 0 12px;max-width:560px}
.tp-desc{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-secondary);margin-bottom:2px}
.tp-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;transition:border-color .15s ease}
.tp-row:hover{border-color:var(--dsw-alias-border-l2)}
.tp-row-active{border-color:var(--dsw-alias-brand-primary)}
.tp-radio{flex:none;width:14px;height:14px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);box-sizing:border-box;background:transparent}
.tp-row-active .tp-radio{border-color:var(--dsw-alias-brand-primary);background:radial-gradient(circle, var(--dsw-alias-brand-primary) 0 45%, transparent 55%)}
.tp-info{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}
.tp-name{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.tp-desc-line{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tp-meta{font-size:12px;color:var(--dsw-alias-label-secondary)}
.tp-right{flex:none;display:flex;align-items:center;gap:8px}
.tp-badge{font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid transparent;white-space:nowrap}
.tp-badge-active{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.tp-badge-off{color:var(--dsw-alias-label-secondary);border-color:var(--dsw-alias-border-l1)}
.tp-badge-warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.tp-btn{font:inherit;font-size:13px;padding:5px 14px;border-radius:8px;border:1px solid var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:transparent;cursor:pointer;white-space:nowrap}
.tp-btn:hover{opacity:.85}
.tp-btn:disabled{opacity:.45;cursor:default}
.tp-btn-secondary{border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}
.tp-resolved{font-size:12px;color:var(--dsw-alias-label-secondary)}
.tp-empty{font-size:13px;color:var(--dsw-alias-label-secondary);padding:8px 0}
.tp-error{font-size:13px;color:var(--dsw-alias-state-error-primary)}
.tp-section-title{display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l1);font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.tp-refresh-btn{font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.tp-refresh-btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary)}
.tp-refresh-btn:disabled{opacity:.5;cursor:default}
.tp-loading{font-size:12px;color:var(--dsw-alias-label-secondary)}
.tp-notice{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--dsw-alias-state-success-primary);border-radius:10px;color:var(--dsw-alias-label-primary);font-size:13px;background:var(--dsw-alias-bg-layer-1)}
.tp-notice-text{flex:1 1 auto;min-width:0}
`;
    const CSS_TAG = "dsh-theme-picker/theme-picker.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-theme-picker";
      tag.dataset.pluginCss = CSS_TAG;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // ---- dsh-market HTTP API (same-origin, relative URLs) ----

    async function marketGet(path) {
      const res = await fetch(path, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error("market GET " + path + " -> " + res.status);
      return res.json();
    }

    async function marketPost(path, body) {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      let data = null;
      try { data = await res.json(); } catch (err) { data = null; }
      if (!res.ok || data === null || typeof data !== "object" || data.ok !== true) {
        throw new Error((data && typeof data.error === "string") ? data.error : "market POST " + path + " -> " + res.status);
      }
      return data;
    }

    function repoOf(url) {
      if (typeof url !== "string") return null;
      const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(url);
      return m === null ? null : m[1];
    }

    function repoFromSpec(spec) {
      if (typeof spec !== "string") return null;
      const s = spec.toLowerCase();
      let m = /(?:^|[^a-z])github:([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?(?:[#\s].*)?$/.exec(s);
      if (m !== null) return m[1];
      m = /github\.com[/:]([a-z0-9_.-]+\/[a-z0-9_.-]+?)(?:\.git)?(?:[#\s].*)?$/.exec(s);
      return m === null ? null : m[1];
    }

    let classifyPromise = null;

    async function classifyThemes() {
      if (classifyPromise !== null) return classifyPromise;
      const promise = (async () => {
        try {
          const data = await marketGet("/dsh-market/registry");
          const names = new Set();
          const repos = new Set();
          const byName = new Map();
          const byRepo = new Map();
          const plugins = data && data.registry && Array.isArray(data.registry.plugins) ? data.registry.plugins : [];
          for (const p of plugins) {
            if (p.category !== "theme") continue;
            const description = {};
            if (p.description !== null && typeof p.description === "object") {
              if (typeof p.description.zh === "string") description.zh = p.description.zh;
              if (typeof p.description.en === "string") description.en = p.description.en;
            }
            const meta = { name: typeof p.name === "string" ? p.name : "", description };
            if (typeof p.name === "string" && p.name !== "") {
              names.add(p.name);
              if (!byName.has(p.name)) byName.set(p.name, meta);
            }
            if (typeof p.npm === "string" && p.npm !== "") {
              names.add(p.npm);
              if (!byName.has(p.npm)) byName.set(p.npm, meta);
            }
            const repo = repoOf(p.url);
            if (repo !== null) {
              const key = repo.toLowerCase();
              repos.add(key);
              if (!byRepo.has(key)) byRepo.set(key, meta);
            }
          }
          return { names, repos, byName, byRepo, failed: false };
        } catch (err) {
          return { names: new Set(), repos: new Set(), byName: new Map(), byRepo: new Map(), failed: true };
        }
      })();
      classifyPromise = promise;
      try {
        return await promise;
      } catch (err) {
        classifyPromise = null;
        return { names: new Set(), repos: new Set(), byName: new Map(), byRepo: new Map(), failed: true };
      }
    }

    async function listThemePlugins() {
      const errors = [];
      const classify = await classifyThemes();
      if (classify.failed) errors.push("registry unavailable");
      let installedData = null;
      try {
        installedData = await marketGet("/dsh-market/installed");
      } catch (err) {
        errors.push(err && err.message ? err.message : String(err));
        return { themes: [], errors };
      }
      const isTheme = (name, spec) => {
        if (classify.names.has(name)) return true;
        const repo = repoFromSpec(spec);
        if (repo !== null && classify.repos.has(repo)) return true;
        // 兜底：按包名关键词识别主题，不依赖 registry 是否可用。
        // 本地/绝对路径安装的主题（如 @dsh-external/*-skin-*）不在
        // registry 名单中，spec 也无法提取 github repo，只能靠名称归类。
        const n = String(name).toLowerCase();
        if (n.indexOf("skin") !== -1 || n.indexOf("theme") !== -1) return true;
        return false;
      };
      const themes = [];
      const installed = (installedData && typeof installedData.installed === "object" && installedData.installed !== null) ? installedData.installed : {};
      const liveNames = Array.isArray(installedData.live) ? installedData.live : [];
      for (const name of Object.keys(installed)) {
        if (!isTheme(name, installed[name])) continue;
        const isLive = liveNames.indexOf(name) !== -1;
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
          if (hasZh || hasEn) description = { zh: hasZh ? meta.description.zh : null, en: hasEn ? meta.description.en : null };
        }
        if (displayName === "") {
          displayName = name.indexOf("@") === 0 && name.indexOf("/") !== -1 ? name.slice(name.indexOf("/") + 1) : name;
        }
        themes.push({
          name,
          displayName,
          description,
          disabled: false,
          live: isLive,
          state: isLive ? "live" : "unknown",
        });
      }
      return { themes, errors };
    }

    async function activateThemePlugin(name) {
      // The market's use-skin route handles exclusivity: it deactivates all
      // other installed themes, activates the target, and persists the choice.
      await marketPost("/dsh-market/use-skin", { name });
    }

    const inject = ["slots", "locale", "theme"];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-theme-picker: dictionaries");
      const t = ctx.locale.bind(NS);
      const theme = ctx.theme;

      function Row(props) {
        const { active, name, desc, meta, badgeText, badgeClass, actionLabel, busy, onAction, secondaryLabel, secondaryBusy, onSecondaryAction, noRowClick } = props;
        const hasAction = actionLabel !== null && actionLabel !== undefined;
        return React.createElement("div", {
          className: "tp-row" + (active ? " tp-row-active" : ""),
          onClick: hasAction && !busy && !noRowClick ? onAction : null,
          style: hasAction && !noRowClick ? null : { cursor: "default" },
        },
          React.createElement("span", { className: "tp-radio" }),
          React.createElement("div", { className: "tp-info" },
            React.createElement("div", { className: "tp-name" }, name),
            desc !== null && desc !== undefined && desc !== ""
              ? React.createElement("div", { className: "tp-desc-line", title: desc }, desc)
              : null,
            React.createElement("div", { className: "tp-meta" }, meta),
          ),
          React.createElement("div", { className: "tp-right" },
            React.createElement("span", { className: "tp-badge " + badgeClass }, badgeText),
            hasAction
              ? React.createElement("button", {
                  type: "button",
                  className: "tp-btn",
                  disabled: busy === true,
                  onClick: (e) => { e.stopPropagation(); onAction(); },
                }, actionLabel)
              : null,
            secondaryLabel
              ? React.createElement("button", {
                  type: "button",
                  className: "tp-btn tp-btn-secondary",
                  disabled: secondaryBusy === true,
                  onClick: (e) => { e.stopPropagation(); onSecondaryAction(); },
                }, secondaryLabel)
              : null,
          ),
        );
      }

      function ThemePickerSection() {
        const [snap, setSnap] = React.useState(() => theme.getTheme());
        const [error, setError] = React.useState(null);
        const [, bump] = React.useState(0);
        const [marketThemes, setMarketThemes] = React.useState(null);
        const [marketError, setMarketError] = React.useState(null);
        const [marketLoading, setMarketLoading] = React.useState(false);
        const [switchingName, setSwitchingName] = React.useState(null);
        const [disablingName, setDisablingName] = React.useState(null);
        const [uninstallingName, setUninstallingName] = React.useState(null);
        const [notice, setNotice] = React.useState(null);

        const refreshMarket = async () => {
          setMarketLoading(true);
          try {
            const res = await listThemePlugins();
            setMarketThemes(Array.isArray(res.themes) ? res.themes : []);
            const errs = Array.isArray(res.errors) ? res.errors : [];
            setMarketError(errs.length > 0 ? t("marketErrorPrefix") + errs.join("; ") : null);
          } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            setMarketError(t("marketErrorPrefix") + msg);
          } finally {
            setMarketLoading(false);
          }
        };

        React.useEffect(() => {
          setSnap(theme.getTheme());
          const offTheme = ctx.on("theme/change", (next) => setSnap(next));
          const offLocale = ctx.on("locale/change", () => bump((n) => n + 1));
          refreshMarket();
          const timerId = window.setInterval(() => { refreshMarket(); }, 6000);
          return () => { offTheme(); offLocale(); window.clearInterval(timerId); };
        }, []);

        const choose = (id) => {
          setError(null);
          try {
            theme.setTheme(id);
            setSnap(theme.getTheme());
          } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            setError(t("errorPrefix") + msg);
          }
        };

        const activatePlugin = async (name) => {
          setSwitchingName(name);
          setNotice(null);
          setMarketError(null);
          try {
            await activateThemePlugin(name);
            setNotice({ text: t("switchedOk", { name }), reload: true });
          } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            setMarketError(t("marketErrorPrefix") + msg);
          } finally {
            setSwitchingName(null);
            refreshMarket();
          }
        };

        const uninstallPlugin = async (name) => {
          if (typeof window !== "undefined" && typeof window.confirm === "function") {
            if (!window.confirm(t("uninstallConfirm", { name }))) return;
          }
          setUninstallingName(name);
          setNotice(null);
          setMarketError(null);
          try {
            await marketPost("/dsh-market/uninstall", { name });
            setNotice({ text: t("uninstalledOk", { name }), reload: true });
          } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            setMarketError(t("marketErrorPrefix") + msg);
          } finally {
            setUninstallingName(null);
            refreshMarket();
          }
        };

        const disablePlugin = async (name) => {
          setDisablingName(name);
          setNotice(null);
          setMarketError(null);
          try {
            // The server has no standalone disable endpoint: the only way to
            // stop a theme is activating another one. Try to fall back to the
            // built-in light theme; if the server rejects it (not an installed
            // theme), guide the user to enable another theme instead.
            await marketPost("/dsh-market/use-skin", { name: "light" });
            setNotice({ text: t("disabledOk", { name }), reload: true });
          } catch (err) {
            setNotice({ text: t("disableGuide"), reload: false });
          } finally {
            setDisablingName(null);
            refreshMarket();
          }
        };

        const reloadPage = () => {
          try {
            if (typeof location !== "undefined" && location !== null && typeof location.reload === "function") {
              location.reload();
              return;
            }
          } catch (err) { /* fall through */ }
          setNotice({ text: t("reloadFallback"), reload: false });
        };

        const themes = Array.isArray(snap.themes) ? snap.themes : [];
        const preference = snap.preference;
        const thirdPartyThemes = themes.filter((def) => def.id !== "light" && def.id !== "dark");
        const sortedMarketThemes = marketThemes === null ? [] : marketThemes.slice().sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0));

        return React.createElement("div", { className: "tp-wrap" },
          thirdPartyThemes.length > 0
            ? React.createElement("div", { className: "tp-desc" }, t("desc"))
            : null,
          thirdPartyThemes.map((def) => {
            const isActive = preference === def.id;
            const scheme = def.colorScheme === "dark" ? t("dark") : t("light");
            return React.createElement(Row, {
              key: def.id,
              active: isActive,
              name: def.id,
              meta: t("plugin") + " · " + scheme,
              badgeText: isActive ? t("active") : t("inactive"),
              badgeClass: isActive ? "tp-badge-active" : "tp-badge-off",
              actionLabel: isActive ? null : t("enable"),
              busy: false,
              onAction: () => choose(def.id),
            });
          }),
          error
            ? React.createElement("div", { className: "tp-error" }, error)
            : null,
          React.createElement("div", { className: "tp-section-title" },
            t("pluginsTitle"),
            React.createElement("button", {
              type: "button",
              className: "tp-refresh-btn",
              disabled: marketLoading === true,
              onClick: () => refreshMarket(),
            }, t("refresh")),
          ),
          notice
            ? React.createElement("div", { className: "tp-notice" },
                React.createElement("span", { className: "tp-notice-text" }, notice.text),
                notice.reload
                  ? React.createElement("button", { type: "button", className: "tp-btn", onClick: reloadPage }, t("reloadNow"))
                  : null,
              )
            : null,
          marketLoading && marketThemes === null
            ? React.createElement("div", { className: "tp-loading" }, t("loading"))
            : null,
          marketThemes !== null && marketThemes.length === 0
            ? React.createElement("div", { className: "tp-empty" }, t("none"))
            : null,
          marketThemes !== null && marketThemes.length > 0
            ? sortedMarketThemes.map((mt) => {
                const busy = switchingName === mt.name || disablingName === mt.name;
                const activeLocale = ctx.locale.getLocale().active;
                let desc = null;
                if (mt.description !== null && mt.description !== undefined) {
                  if (activeLocale === "zh") desc = mt.description.zh || mt.description.en || null;
                  else desc = mt.description.en || mt.description.zh || null;
                }
                let badgeText;
                let badgeClass;
                let actionLabel = null;
                if (mt.live) {
                  badgeText = t("active");
                  badgeClass = "tp-badge-active";
                  actionLabel = disablingName === mt.name ? t("switching") : t("disable");
                } else if (mt.disabled) {
                  badgeText = t("inactive");
                  badgeClass = "tp-badge-off";
                  actionLabel = busy ? t("switching") : t("enable");
                } else {
                  badgeText = mt.state === "restart" ? t("pending") : t("unknownState");
                  badgeClass = "tp-badge-warn";
                  actionLabel = busy ? t("switching") : t("enable");
                }
                return React.createElement(Row, {
                  key: mt.name,
                  active: mt.live,
                  name: mt.displayName && mt.displayName !== "" ? mt.displayName : mt.name,
                  desc,
                  meta: mt.name,
                  badgeText,
                  badgeClass,
                  actionLabel,
                  busy,
                  noRowClick: mt.live,
                  onAction: () => (mt.live ? disablePlugin(mt.name) : activatePlugin(mt.name)),
                  secondaryLabel: t("uninstall"),
                  secondaryBusy: uninstallingName === mt.name,
                  onSecondaryAction: () => uninstallPlugin(mt.name),
                });
              })
            : null,
          marketError
            ? React.createElement("div", { className: "tp-error" }, marketError)
            : null,
        );
      }

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "themes",
        order: 18,
        label: () => t("title"),
        locale: NS,
      }, ThemePickerSection));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
