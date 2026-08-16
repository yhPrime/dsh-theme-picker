# dsh-theme-picker

DeepSeek Harness 主题选择插件 —— 在设置面板中添加「主题」页面：统一管理应用主题与已安装的主题插件，同一时间仅一个主题生效，其余自动禁用。

A theme picker plugin for DeepSeek Harness: adds a **Themes** page to the Settings panel. It manages both app themes and installed theme plugins — only one theme stays active at a time, the others are disabled automatically.

## 功能 / Features

- **应用主题（App themes）**：列出 跟随系统 / 浅色 / 深色 以及皮肤插件注册的主题，点击即切换，同一时间仅一个生效。
- **已安装的主题插件（Installed theme plugins）**：通过 dsh-market API 列出所有已安装的主题插件（含被禁用的），显示注册表友好名（如 `dsh-maid-whale-webUI`）与随界面语言切换的中英文描述。
- **一键启用、单主题独享**：启用某个主题插件时自动禁用其他所有主题插件（先走 market 的 `use-skin`，市场分类器不识别时降级为 `/toggle` 手动独享），选择持久化到 market 的 `state.json`，重启后保持。
- **实时同步**：列表每 6 秒刷新，与 dsh-market 页面状态互通；切换成功后提示刷新页面应用新皮肤。

## 安装 / Installation

本插件是标准的 dsh bundle 插件（`dsh.bundle` + `dsh.client`）。

### 方式一：本地目录（推荐）

```bash
# 将本仓库放到 profile 目录旁，然后：
dsh plugin --profile web add file:./dsh-theme-picker
```

或手动两步：

1. 在 profile 的 `package.json` 里添加依赖与 bundle 条目：

```json
"dependencies": { "dsh-theme-picker": "file:./dsh-theme-picker" },
"dsh": { "profile": { "bundles": ["dsh-theme-picker"] } }
```

2. 在 `node_modules` 中建立链接（junction），或运行 `pnpm install`：

```powershell
New-Item -ItemType Junction -Path node_modules\dsh-theme-picker -Target ..\dsh-theme-picker
```

### 方式二：git 依赖

```bash
dsh plugin --profile web add git+https://github.com/yhPrime/dsh-theme-picker.git
```

安装后重启 DeepSeek Harness，插件随组合自动加载（可在市场「插件」页停用/启用）。

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
├── package.json        # dsh.bundle + dsh.client 声明
├── cordis.patch.yml    # bundle 层 insert 补丁
├── lib/
│   ├── index.js        # Host 入口（空实现）
│   └── client.js       # 设置页「主题」分区 UI 与 market API 集成
└── README.md
```

## License

MIT
