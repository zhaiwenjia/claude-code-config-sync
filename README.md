# claude-sync 设计文档

> **目标：** Claude Code 配置同步工具，通过 GitHub/GitLab 实现跨机器同步。支持 slash command（push）和独立 CLI（create）两种使用方式。

---

## 一、核心概念

### 配置分层

| 配置 | 存储位置 | GitHub 路径 |
|------|----------|-------------|
| **local** | 代码仓内的 `.claude/` 和 `CLAUDE.md` | `claude-code-config-sync/local/` |
| **global** | `~/.claude/`（不含 CLAUDE.md） | `claude-code-config-sync/global/` |

### 同步方向

```
push（上传统一仓库）:
  ~/.claude/（不含 CLAUDE.md）→  github.com/{user}/claude-code-config-sync/global/
  当前代码仓的 .claude/ + CLAUDE.md  →  github.com/{user}/claude-code-config-sync/local/

create（下载到本地）:
  github.com/{user}/claude-code-config-sync/global/  →  ~/.claude/（默认）
  github.com/{user}/claude-code-config-sync/local/   →  当前代码仓（--local）
```

### 合并策略

GitHub 仓库中只保留一份汇总内容：

```
claude-code-config-sync/
├── local/                     # 汇总后的 local 配置
│   ├── CLAUDE.md
│   ├── .claude/
│   │   ├── settings.json      ← 唯一版本
│   │   ├── rules/
│   │   ├── skills/
│   │   └── manifest.json      # 依赖记录
└── global/                    # 汇总后的 global 配置
    ├── .claude/
    │   ├── settings.json
    │   ├── skills/
    │   ├── plugins/
    │   └── manifest.json      # 依赖记录
    └── ...
```

**push 合并规则：**
- 文件不存在 → 新增
- 文件存在且相同 → 跳过
- 文件存在且不同 → **由 Claude Code CLI 内置 LLM 分析差异，增量更新到远程**
- **覆盖确认**：远程有同名配置时，询问用户确认覆盖 / 否认终止

**create 行为：**
- 直接覆盖本地文件
- **覆盖确认**：本地有配置文件时，询问用户确认覆盖 / 否认终止
- 自动检测并安装依赖（manifest.json 中记录的 MCP/plugins）

### manifest.json

记录需要同步的 MCP 和 plugins 依赖（不含实际文件内容）：

```json
{
  "mcps": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright@latest"]
    }
  },
  "plugins": [
    "anthropics/claude-code",
    "superpowers/superpowers"
  ],
  "lastSync": "2026-05-03T10:00:00Z"
}
```

**字段说明：**
| 字段 | 说明 |
|------|------|
| `mcps` | MCP 服务器配置，key 为服务器名称，value 包含 `command` 和 `args` |
| `plugins` | 插件列表，每项为 `<owner>/<repo>` 格式 |
| `lastSync` | 最后同步时间（ISO 8601 格式） |

**自动安装依赖流程：**
```
下载配置
   ↓
读取 manifest.json
   ↓
检测本地已安装的 MCP/plugins
   ↓
MCP：写入 ~/.claude.json 的 mcpServers 节点
Plugins：执行 /plugin marketplace add 和 /plugin install
```

---

## 二、命令设计

### /claude-sync — Claude Code 命令

用户输入 `/claude-sync` 后弹出选择菜单：

```
/claude-sync
├── push                → 上传 global 配置（默认）
├── push --local        → 上传 local 配置到当前代码仓
├── create              → 下载 global 到 ~/.claude/（默认）
└── create --local       → 下载 local 配置到当前代码仓
```

> `--local` 触发交互式引导：询问是否创建代码仓 → 拉取配置

### push — 上传配置

```bash
# 上传 global 配置（默认）
claude-sync push

# 上传 local 配置
claude-sync push --local
```

**行为逻辑：**
- `push` 默认上传 global 配置（`~/.claude/`）
- `--local` 上传当前代码仓的 local 配置（`.claude/` + `CLAUDE.md`）到远程仓库
- 遍历 `.claude/` 各子目录，如果存在就逐个分析增量合并
- **覆盖确认**：上传前检测远程是否有同名配置，询问用户确认覆盖 / 否认终止

**自动创建仓库：**
- push --local 时自动创建（如本地已有 remote 仓库则跳过）
- 仓库默认为 **private**

### create — 下载配置

```bash
# 下载 global 到 ~/.claude/（默认）
claude-sync create

# 下载 local 配置（交互式引导）
claude-sync create --local
```

**--local 交互式引导流程：**
```
1. 检测当前目录是否为 Git 仓库
   ├── 是 → 进入步骤 2
   └── 否 → 提示"当前目录不是 Git 仓库"，询问是否初始化
            ├── 否 → 终止
            └── 是 → git init，进入步骤 2

2. 询问是否需要创建 GitHub/GitLab 远程仓库
   ├── 否 → 跳过，进入步骤 4
   └── 是 → 进入步骤 3

3. 自动创建远程仓库
   a. 检测同名仓库（当前文件夹名称）
       ├── 没有 → 自动创建同名仓库
       └── 有 → 询问新仓库名称，用户输入后创建
   b. 添加 remote 为 origin

4. 拉取 remote 的 local 配置到当前代码仓

5. 前置检查（覆盖确认）
   ├── 当前目录有 .claude/ 或 CLAUDE.md → 询问确认覆盖
   └── 无 → 直接拉取

6. 读取 manifest.json，自动安装 MCP/plugins 依赖
```

**前置检查：**

| 检查项 | 本地状态 | 行为 |
|--------|----------|------|
| global | `~/.claude/` 不存在 | 直接下载 |
| global | `~/.claude/` 已存在 | 询问用户 → 确认覆盖 / 否认终止 |
| local | 当前目录无 .claude/ 和 CLAUDE.md | 直接拉取 |
| local | 当前目录有 .claude/ 或 CLAUDE.md | 询问用户 → 确认覆盖 / 否认终止 |

**独立检查规则：**
- global 和 local 独立判断，互不影响
- 用户同意覆盖 → 下载并覆盖本地文件
- 用户否认 → 终止操作

---

## 三、认证与平台

### 平台自动检测

自动检测 GitHub / GitLab：

| 检测结果 | 行为 |
|----------|------|
| 只配置了 GitHub | 直接用 GitHub |
| 只配置了 GitLab | 直接用 GitLab |
| 两个都没配置 | 让用户选择配置 |
| 两个都配置了 | 让用户选择使用 |

```bash
# 检测命令
gh auth status &>/dev/null && echo "GH_CONFIGURED=true"
glab auth status &>/dev/null && echo "GLAB_CONFIGURED=true"
```

### 自动检测顺序

1. **GitHub Token** — 环境变量 `GITHUB_TOKEN`
2. **SSH Key** — SSH Agent 中已加载的密钥

### 引导设置

如果未检测到任何凭证，显示设置选项：
```
未检测到 GitHub/GitLab 凭证，请选择设置方式：

1. GitHub Token（设置 GITHUB_TOKEN 环境变量）
2. GitLab Token（设置 GITLAB_TOKEN 环境变量）
3. SSH Key（确保 ssh-agent 已加载密钥）

请选择设置方式（或按 q 退出）：
```

> 认证由用户自行解决，插件不处理复杂的 GitHub App 认证流程。

---

## 四、技术实现

### 技术栈

- **语言：** TypeScript / Node.js
- **发布平台：** npm
- **集成方式：** Claude Code slash command（命令菜单）
- **平台 API：** @octokit/rest（GitHub）、@fawn/cli（GitLab）
- **Git 操作：** simple-git / isomorphic-git

### 项目结构

```
claude-code-config-sync/
├── src/
│   ├── index.ts          # 插件入口（slash command 注册）
│   ├── commands/
│   │   ├── push.ts        # push 命令实现
│   │   └── create.ts      # create 命令实现
│   ├── platform/
│   │   ├── auth.ts        # 认证检测
│   │   ├── github.ts       # GitHub 操作
│   │   └── gitlab.ts       # GitLab 操作
│   ├── sync/
│   │   ├── merger.ts      # 文件合并逻辑
│   │   └── diff.ts        # 增量更新
│   └── utils/
│       └── logger.ts      # 日志工具
├── bin/
│   └── claude-sync.js     # CLI 入口
├── package.json
├── tsconfig.json
└── README.md

~/.claude/commands/           # Claude Code 命令定义
└── claude-sync.md            # /claude-sync 命令菜单定义
```

### Claude Code 集成方式

在 `~/.claude/commands/claude-sync.md` 中定义 slash command 菜单：

```markdown
# claude-sync

Claude Code 配置同步工具。

## 选项

- push：上传 global 配置（默认）
- push --local：上传 local 配置到当前代码仓
- create：下载 global 到 ~/.claude/（默认）
- create --local：下载 local 配置（交互式引导）

## 使用场景

- `/claude-sync push`：保存全局配置
- `/claude-sync push --local`：保存当前项目的配置
- `/claude-sync create`：恢复全局配置
- `/claude-sync create --local`：恢复当前项目的配置（自动创建仓库）
```

---

## 五、npm 包设计

### package.json

```json
{
  "name": "@laozhai/claude-config-sync",
  "version": "0.1.0",
  "description": "Claude Code config sync via GitHub/GitLab",
  "main": "dist/index.js",
  "bin": {
    "claude-sync": "bin/claude-sync.js"
  },
  "keywords": ["claude-code", "claude-code-config", "sync", "dotfiles"],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 六、错误处理

| 场景 | 处理方式 |
|------|----------|
| push 无 Git 仓库 | 输出 info 日志并跳过 |
| push --local 远程有同名配置 | 询问用户确认覆盖 / 否认终止 |
| push 有冲突 | 调用 Claude Code CLI 内置 LLM 分析差异，增量更新到远程 |
| create --local 无 Git 仓库 | 询问是否初始化 git |
| create 目标已有配置 | 询问用户确认 |
| 无 GitHub/GitLab 凭证 | 显示引导设置菜单 |
| 网络错误 | 重试 3 次后报错 |

---

## 七、发布流程

1. **开发阶段** → `npm link` 本地测试
2. **发布 npm** → `npm publish --access public`
3. **用户安装** → `npm install -g @laozhai/claude-code-config-sync`
4. **使用** → Claude Code 中用 `/claude-sync push`，终端中用 `claude-sync create`（默认 global）

---

## 八、使用流程

### 首次使用

1. 安装：`npm install -g @laozhai/claude-config-sync`
2. Claude Code 中使用 push：
   - 重启 Claude Code
   - 输入 `/claude-sync push`（默认 global）或 `/claude-sync push --local`（local）
3. 终端中使用 create：
   - 直接运行 `claude-sync create`（默认 global）
   - 或 `claude-sync create --local`（local，自动引导创建仓库）

### 日常使用

**在 Claude Code 中使用（push 上传配置）：**
```bash
/claude-sync push              → 上传 global 配置（默认）
/claude-sync push --local     → 上传 local 配置
```

**在终端中使用（create 下载配置）：**
```bash
claude-sync create             → 下载 global 到 ~/.claude/（默认）
claude-sync create --local    → 下载 local 配置（交互式引导创建仓库）
```

---

## 九、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2026-05-03 | 初始设计，Claude Code slash command 架构，GitHub/GitLab 双平台支持 |

---

*文档更新：2026-05-03*