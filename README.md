# dsh-theme-picker

DeepSeek Harness 的**主题管理器**：一个右侧栏页签 + 一个设置页，用同一块面板管理「原生主题」和「已装的主题插件」，同一时间只有一个主题生效。

A **theme manager** for DeepSeek Harness: one panel in the right sidebar plus a Settings page. It manages native themes and installed theme plugins, with only one theme active at a time.

## 功能 / Features

- **右侧栏入口**：在 DSH 右侧栏页签列表里注册「主题」页签（经 `dsh-better-sidebar` 的公开服务 `ctx.betterSidebar.registerTab`）。没装该插件时自动跳过，退到设置页。
- **原生主题**：读取客户端 `theme` 服务的快照，列出跟随系统 / 浅色 / 深色 / 其它已注册主题（`ctx.theme.register` 注册的一等主题），点击即时切换、即时生效。
- **已装主题插件**：通过 dsh-market 同源路由 `GET /dsh-market/installed`、`GET /dsh-market/registry` 列出所有已装主题插件（含被禁用的），显示注册表友好名与双语描述。
- **单主题独享**：启用走 `POST /dsh-market/toggle`（market 自身负责主题排他），禁用与卸载也走 market 路由；状态写入 market 的 `state.json`，重启后保持。
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
