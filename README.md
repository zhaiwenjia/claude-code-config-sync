# claude-sync 设计文档

> **目标：** Claude Code 全局插件，跨机器同步配置，通过 GitHub 作为后端存储。

---

## 一、核心概念

### 配置分层

| 配置 | 存储位置 | GitHub 路径 |
|------|----------|-------------|
| **local** | 代码仓内的 `.claude/` 和 `CLAUDE.md` | `claude-code-config-sync/local/` |
| **global** | `~/.claude/` | `claude-code-config-sync/global/` |

### 同步方向

```
push（上传统一仓库）:
  当前代码仓/.claude/ + CLAUDE.md  →  github.com/{user}/claude-code-config-sync/local/
                                       （按文件类型增量合并）

create（下载到代码仓）:
  github.com/{user}/claude-code-config-sync/local/  →  当前代码仓/
```

### 合并策略（push 时）

GitHub 上的仓库只保留一份汇总内容：

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

**文件合并规则：**
- 文件不存在 → 新增
- 文件存在且相同 → 跳过
- 文件存在且不同 → **由 Claude Code LLM 分析差异，合并增量到远程**

**冲突处理流程：**
```
1. 检测到本地文件与远程文件内容不同
2. LLM 分析两份文件的差异
3. LLM 输出合并后的增量内容
4. 增量更新到 GitHub（而非覆盖整个文件）
```

---

## 二、命令设计

### /sync — Claude Code 内置命令

用户输入 `/sync` 后弹出选择菜单：

```
/sync
├── push              → 上传 local 配置
├── push --global     → 上传 global + local
├── create            → 下载 local 到当前目录
└── create --global   → 下载 local + global
```

### push — 上传配置

```bash
# 上传当前代码仓的 local 配置
sync push

# 上传 global + local
sync push --global
```

**行为逻辑：**
- 无参数：在当前目录寻找 Git 仓库，找到就上传，找不到就跳过（不报错）
- `--global`：额外上传 `~/.claude/` 到 `claude-code-config-sync` 的 `global/` 目录

**自动创建仓库：**
- 首次 push 到仓库时自动创建（如本地已有仓库则跳过）

### create — 下载配置

```bash
# 下载 local 配置到当前目录
sync create

# 额外同步 global 配置到 ~/.claude/
sync create --global
```

**create 前置检查（local 和 global 分别检查）：**

| 检查项 | 本地状态 | 行为 |
|---------|---------|------|
| local | 当前目录无 .claude/ 和 CLAUDE.md | 直接下载 |
| local | 当前目录有 .claude/ 或 CLAUDE.md | 询问用户 → 确认覆盖 / 否认终止 |
| global | ~/.claude/ 不存在 | 直接下载 |
| global | ~/.claude/ 已存在 | 询问用户 → 确认覆盖 / 否认终止 |

**独立检查规则：**
- local 和 global 独立判断，互不影响
- 用户同意覆盖 → 下载并覆盖本地文件
- 用户否认 → 终止该层（另一层不受影响）

---

## 三、认证机制

### 自动检测顺序

1. **GitHub Token** — 环境变量 `GITHUB_TOKEN`
2. **GitHub App** — 环境变量 `GITHUB_APP_ID` + `GITHUB_APP_KEY`
3. **SSH Key** — SSH Agent 中已加载的密钥

### 引导设置

如果未检测到任何凭证，显示设置选项：
```
未检测到 GitHub 凭证，请选择设置方式：

1. GitHub Token（设置 GITHUB_TOKEN 环境变量）
2. GitHub App（设置 GITHUB_APP_ID 和 GITHUB_APP_KEY）
3. SSH Key（确保 ssh-agent 已加载密钥）

请选择设置方式（或按 q 退出）：
```

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
claude-sync/
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

~/.claude/commands/           # Claude Code 命令定义
└── sync.md                   # /sync 命令菜单定义
```

### Claude Code 集成方式

在 `~/.claude/commands/sync.md` 中定义 slash command 菜单：

```markdown
# sync

Claude Code 配置同步工具。

## 选项

- push：上传当前代码仓配置到 GitHub
- push --global：上传 global + local 配置
- create：下载 GitHub 配置到当前代码仓
- create --global：下载 global + local 配置

## 使用场景

- `/sync push`：保存当前项目的配置
- `/sync create`：恢复之前同步的配置
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
| push 无 Git 仓库 | 跳过，静默返回 |
| push 有冲突 | 调用 Claude Code LLM 分析差异，合并增量到远程 |
| create 目标已有 .claude/ | 询问用户确认 |
| 无 GitHub 凭证 | 显示引导设置菜单 |
| 网络错误 | 重试 3 次后报错 |

---

## 七、发布流程

1. **开发阶段** → `npm link` 本地测试
2. **发布 npm** → `npm publish --access public`
3. **用户安装** → `npm install -g @laozhai/claude-config-sync`
4. **使用** → Claude Code 中输入 `/sync`

---

## 八、使用流程

### 首次使用

1. 安装插件：`npm install -g @laozhai/claude-config-sync`
2. 重启 Claude Code
3. 输入 `/sync`，选择操作

### 日常使用

```bash
# 场景1：保存当前项目配置
/sync → push

# 场景2：多机器同步全局配置
/sync → push --global

# 场景3：新机器恢复配置
/sync → create

# 场景4：多机器恢复全局配置
/sync → create --global
```

---

## 九、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | 2026-05-01 | 初始设计，Claude Code slash command 架构 |

---

*文档更新：2026-05-01*