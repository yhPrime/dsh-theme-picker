# dsh-theme-picker

DeepSeek Harness 的**主题管理器**：一个右侧栏页签 + 一个设置页，用同一块面板管理「原生主题」和「已装的主题插件」，同一时间只有一个主题生效。

A **theme manager** for DeepSeek Harness: one panel in the right sidebar plus a Settings page. It manages native themes and installed theme plugins, with only one theme active at a time.

## 功能 / Features

- **右侧栏入口**：在 DSH 右侧栏页签列表里注册「主题」页签（经 `dsh-better-sidebar` 的公开服务 `ctx.betterSidebar.registerTab`）。没装该插件时自动跳过，退到设置页。
- **原生主题**：读取客户端 `theme` 服务的快照，列出跟随系统 / 浅色 / 深色 / 其它已注册主题（`ctx.theme.register` 注册的一等主题），点击即时切换、即时生效。
- **已装主题插件**：通过 dsh-market 同源路由 `GET /dsh-market/installed`、`GET /dsh-market/registry` 列出所有已装主题插件（含被禁用的），显示注册表友好名与双语描述。
- **单主题独享（本地强制）**：启用任何主题插件时，先走 `POST /dsh-market/toggle`，随后由本插件**再逐个收掉其余正在生效的主题**并复查一遍——因为 market 只对注册表分类里的主题做排他（编译进名单或带包根 `skin.json` 的），本地目录装的、私有仓库装的、名单外的皮肤走的是普通开关，不排他。收不掉的会在面板上报错并点名。面板打开时若发现多个主题同时在画面上生效，顶部会出现黄色告警条与「只保留「X」」一键收敛按钮。
- **软开关（保持启用、只关外观）**：带独立开关的主题不再被停用，而是只关掉它的外观——插件保持启用、宿主半照常跑、不需要刷新页面。内置适配器：`dsh-cyrene-theme`（`GET/POST /cyrene/state` 带 `rev` 乐观锁，字段 `theme`，落到 `body[data-cyrene-skin]`）。没有适配器的皮肤仍走 loader 开关。
- **底座与皮肤分层**：有主题插件在画面上生效时，原生主题区标记为「底层配色」而不是「使用中」——同一时间只有一个主题插件在画面上生效，原生配色只是它脚下的那层。
- **可见时才轮询**：页签不在前台时停止 8s 轮询；`theme/change` 事件驱动原生主题区实时刷新。

## 安装 / Installation

这是一个**官方形态的 cordis bundle**：`package.json` 声明 `dsh.bundle.patch` 与 `dsh.client`，`cordis.patch.yml` 插入一行 loader 入口。

```bash
dsh plugin --profile <desktop|web> add <本目录绝对路径>
# 或 git 依赖
dsh plugin --profile <desktop|web> add git+https://github.com/yhPrime/dsh-theme-picker.git
```

装完**硬刷新浏览器**（Ctrl+Shift+R）。要求宿主 DSH **0.2.1-rc.1+**。

## 可选依赖 / Optional

- [dshmarket](https://github.com/anywhere-labs/dshmarket)（1.70+）：没有它时面板只显示原生主题，插件区提示「未检测到 dsh-market」。
- [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)（0.28+）：没有它时不出右侧栏页签，只在设置页出现「主题」。

## 目录 / Layout

```
dsh-theme-picker/
├── package.json        # bundle 声明（dsh.bundle / dsh.client / exports / files）
├── cordis.patch.yml    # 插入 loader 行 id: theme-picker
├── index.js            # 宿主半：空 apply（主题逻辑全在浏览器侧）
├── client.js           # 客户端半：模块加载器工厂 + 右侧栏页签 + 设置页
├── locale/{zh,en}.json # 插件管理器与设置页读的 meta.title / meta.description
└── icon.svg            # 插件图标（原始绘制）
```

## 从 1.x 升级 / Upgrading from 1.x

1.x 是 `@dsh-std` 的「标准组件」（`dsh-plugin.json` + `facets.host` + `context.protocols` 协议层），依赖 `@dsh-std/adapter-dsh`，而该适配包的 peer 范围止于 DSH `<0.2.1`，在 0.2.1 线上不成立。2.0 起改回 DSH 官方 bundle 形态，`dsh-plugin.json` 与 `lib/` 已删除。

## License

MIT
