# claude-code-config-sync 设计文档

> **目标：** Claude Code 配置同步工具，支持 slash command 和独立 CLI 两种使用方式，通过 GitHub 作为后端存储实现跨机器同步。

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
  --path 指定目录的 .claude/ + CLAUDE.md  →  github.com/{user}/claude-code-config-sync/local/

create（下载到本地）:
  github.com/{user}/claude-code-config-sync/global/  →  ~/.claude/（默认）
  github.com/{user}/claude-code-config-sync/local/   →  --path 指定目录（.claude/ + CLAUDE.md）
```

### 合并策略

GitHub 仓库中只保留一份汇总内容：

```
claude-code-config-sync/
├── local/                     # 汇总后的 local 配置
│   ├── CLAUDE.md
│   └── .claude/
│       ├── settings.json      ← 唯一版本
│       ├── rules/
│       └── skills/
└── global/                    # 汇总后的 global 配置
    └── ...
```

**push 合并规则：**
- 文件不存在 → 新增
- 文件存在且相同 → 跳过
- 文件存在且不同 → **由 Claude Code CLI 内置 LLM 分析差异，增量更新到远程**

**create 行为：**
- 直接覆盖本地文件

---

## 二、命令设计

### /claude-sync — Claude Code 命令

用户输入 `/claude-sync` 后弹出选择菜单：

```
/claude-sync
├── push                → 上传 local 配置
├── push                → 上传 global 配置（默认）
├── create              → 下载 global 到 ~/.claude/（默认）
├── create --path=<路径> → 下载 local 到指定目录（--path 必须有值）
```

> `--path` 为空则被忽略，默认下载到当前目录。

### push — 上传配置

```bash
# 上传 global 配置（默认）
claude-sync push

# 上传 local 配置
claude-sync push --path=/some/path
```

**行为逻辑：**
- `push` 默认上传 global 配置（`~/.claude/`）
- `--path` 有值时上传 local 配置（`--path` 指定目录的 `.claude/`）
- 遍历 `.claude/` 各子目录，如果存在就逐个分析增量合并

**自动创建仓库：**
- 首次 push 到仓库时自动创建（如本地已有仓库则跳过）
- 仓库默认为 **private**（用户需自行在 GitHub 创建空仓库并配置认证）

### create — 下载配置

```bash
# 下载 global 到 ~/.claude/（默认）
claude-sync create

# 下载 local 到指定目录（--path 必须有值）
claude-sync create --path=/some/path
```

> `--path` 为空则报错，--path 必须有值才对 local 操作

**前置检查：**

| 检查项 | 本地状态 | 行为 |
|--------|----------|------|
| global | `~/.claude/` 不存在 | 直接下载 |
| global | `~/.claude/` 已存在 | 询问用户 → 确认覆盖 / 否认终止 |
| local | 指定目录无 .claude/ | 直接下载 |
| local | 指定目录有 .claude/ | 询问用户 → 确认覆盖 / 否认终止 |

**独立检查规则：**
- global 和 local 独立判断，互不影响
- 用户同意覆盖 → 下载并覆盖本地文件
- 用户否认 → 终止操作

---

## 三、认证机制

### 自动检测顺序

1. **GitHub Token** — 环境变量 `GITHUB_TOKEN`
2. **SSH Key** — SSH Agent 中已加载的密钥

### 引导设置

如果未检测到任何凭证，显示设置选项：
```
未检测到 GitHub 凭证，请选择设置方式：

1. GitHub Token（设置 GITHUB_TOKEN 环境变量）
2. SSH Key（确保 ssh-agent 已加载密钥）

请选择设置方式（或按 q 退出）：
```

> 认证由用户自行解决，插件不处理复杂的 GitHub App 认证流程。

---

## 四、技术实现

### 技术栈

- **语言：** TypeScript / Node.js
- **发布平台：** npm
- **集成方式：** Claude Code slash command（命令菜单）
- **GitHub API：** @octokit/rest
- **Git 操作：** simple-git / isomorphic-git

### 项目结构

```
claude-code-config-sync/
├── src/
│   ├── index.ts          # 插件入口（slash command 注册）
│   ├── commands/
│   │   ├── push.ts        # push 命令实现
│   │   └── create.ts      # create 命令实现
│   ├── github/
│   │   ├── auth.ts        # 认证检测
│   │   └── repo.ts        # 仓库操作
│   ├── sync/
│   │   ├── merger.ts      # 文件合并逻辑
│   │   └── diff.ts        # 增量更新
│   └── utils/
│       └── logger.ts      # 日志工具
├── package.json
├── tsconfig.json
└── README.md

~/.claude/commands/               # Claude Code 命令定义
└── claude-sync.md                # /claude-sync 命令菜单定义
```

### Claude Code 集成方式

在 `~/.claude/commands/claude-sync.md` 中定义 slash command 菜单：

```markdown
# claude-sync

Claude Code 配置同步工具。

## 选项

- push：上传 global 配置（默认）
- push --path=\<路径\>：上传 local 配置
- create：下载 global 到 ~/.claude/（默认）
- create --path=\<路径\>：下载 local 到指定目录（--path 必须有值）

## 使用场景

- `/claude-sync push`：保存全局配置
- `/claude-sync push --path=/some/path`：保存指定项目的配置
- `/claude-sync create`：恢复全局配置
- `/claude-sync create --path=/some/path`：恢复指定项目的配置
```

---

## 五、npm 包设计

### package.json

```json
{
  "name": "@laozhai/claude-config-sync",
  "version": "0.1.0",
  "description": "Claude Code config sync via GitHub",
  "main": "dist/index.js",
  "bin": {
    "claude-code-config-sync": "bin/claude-code-config-sync.js"
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
| push 有冲突 | 调用 Claude Code CLI 内置 LLM 分析差异，增量更新到远程 |
| create 目标已有 .claude/ | 询问用户确认 |
| 无 GitHub 凭证 | 显示引导设置菜单 |
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
   - 输入 `/claude-sync push`（默认 global）或 `/claude-sync push --path=/some/path`（local）
3. 终端中使用 create：
   - 直接运行 `claude-sync create`（默认 global）
   - 或 `claude-sync create --path=/some/path`（local）

### 日常使用

**在 Claude Code 中使用（push 上传配置）：**
```bash
/claude-sync push              → 上传 global 配置（默认）
/claude-sync push --path=/some/path → 上传 local 配置
```

**在终端中使用（create 下载配置）：**
```bash
claude-sync create                      → 下载 global 到 ~/.claude/（默认）
claude-sync create --path=/some/path  → 下载 local 到指定目录（--path 必须有值）
```

---

## 九、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2026-05-01 | 初始设计，Claude Code slash command 架构 |

---

*文档更新：2026-05-01*