# dsh-theme-picker

DeepSeek Harness 主题选择插件 —— 在设置面板中添加「主题」页面：统一管理应用主题与已安装的主题插件，同一时间仅一个主题生效，其余自动禁用。

A theme picker plugin for DeepSeek Harness: adds a **Themes** page to the Settings panel. It manages both app themes and installed theme plugins — only one theme stays active at a time, the others are disabled automatically.

## 功能 / Features

- **应用主题（App themes）**：列出 跟随系统 / 浅色 / 深色 以及皮肤插件注册的主题，点击即切换，同一时间仅一个生效。
- **已安装的主题插件（Installed theme plugins）**：通过 dsh-market API 列出所有已安装的主题插件（含被禁用的），显示注册表友好名（如 `dsh-maid-whale-webUI`）与随界面语言切换的中英文描述。
- **一键启用、单主题独享**：启用某个主题插件时自动禁用其他所有主题插件（先走 market 的 `use-skin`，市场分类器不识别时降级为 `/toggle` 手动独享），选择持久化到 market 的 `state.json`，重启后保持。
- **实时同步**：列表每 6 秒刷新，与 dsh-market 页面状态互通；切换成功后提示刷新页面应用新皮肤。

## 安装 / Installation

本插件是 **DSH 标准组件**（Community `dsh-plugin.json` v0.15）：由
[@dsh-std/adapter-dsh](https://github.com/Yan-Zero/dsh-std) 在宿主激活时扫描普通依赖并装载
`facets.host.entry`，**不是** cordis bundle（无 `dsh.bundle` / `cordis.patch.yml`），
因此不需要也不会进入 `dsh.profile.bundles`。

前置：宿主内核 `@deepseek-ai/dsh-* >= 0.1.2-alpha.2` 且 profile 已安装 `@dsh-std/adapter-dsh`。

### 方式一：git 依赖（GitHub 仓库）

```bash
# 依赖以普通 dependency 形式加入即可，adapter 扫描激活
dsh plugin --profile web add git+https://github.com/yhPrime/dsh-theme-picker.git
```

或手动在 profile `package.json` 的 `dependencies` 加一行后 `pnpm install`：

```json
"dependencies": { "dsh-theme-picker": "github:yhPrime/dsh-theme-picker" }
```

### 方式二：本地目录

```bash
dsh plugin --profile web add file:./dsh-theme-picker
```

安装后重启 DeepSeek Harness；设置面板出现「主题」页。可在市场「插件」页停用/启用本组件。

## 依赖 / Requirements

- DeepSeek Harness（Web profile）
- [dshmarket](https://github.com/anywhere-labs/dshmarket)（主题插件清单、启用/禁用与持久化均通过其 HTTP API 完成）

## 原理 / How it works

- 「应用主题」直接使用客户端 `theme` 服务（`getTheme` / `setTheme`）。
- 「已安装的主题插件」调用 dsh-market 同源路由：`GET /dsh-market/installed`、`GET /dsh-market/registry`（主题分类与双语描述）、`POST /dsh-market/use-skin`、`POST /dsh-market/toggle`。
- 市场分类器只按注册名或 `github:` 规格识别主题；对以 `git+https://github.com/...` 安装的皮肤插件（如 `@dsh-external/*-skin-*`），本插件按仓库地址补充分类，并在 `use-skin` 拒绝时降级为手动独享切换，保持与市场状态一致。

## 目录 / Layout

```
dsh-theme-picker/
├── package.json        # 普通依赖声明；含 dshStd 自描述可选字段
├── dsh-plugin.json     # Community v0.15 标准组件清单（adapter 发现依据）
├── lib/
│   ├── index.js        # Host facet 入口（空激活，职责见上）
│   └── client.js       # 设置页「主题」分区 UI 与 market API 集成
└── README.md
```

## License

MIT
