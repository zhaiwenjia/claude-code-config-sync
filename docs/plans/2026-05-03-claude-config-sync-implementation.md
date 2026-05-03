# Claude Config Sync Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 Claude Code 配置同步插件，通过 GitHub/GitLab 实现跨机器同步

**Architecture:**
- 作为 Claude Code 插件实现，提供 skills 和 commands
- 通过简单-git 进行 Git 操作，通过 @octokit/rest 与 GitHub API 交互
- 配置分层：global（~/.claude/）和 local（代码仓内的 .claude/ 和 CLAUDE.md）

**Tech Stack:**
- Claude Code Plugin
- Node.js (simple-git, @octokit/rest)
- TypeScript

---

## Phase 1: 插件基础结构

### Task 1: 创建插件目录和 manifest

**Files:**
- Create: `claude-config-sync/.claude-plugin/plugin.json`
- Create: `claude-config-sync/.claude-plugin/marketplace.json`
- Create: `claude-config-sync/README.md`

**Step 1: 创建目录结构**

```bash
mkdir -p claude-config-sync/.claude-plugin
mkdir -p claude-config-sync/skills/config-sync
mkdir -p claude-config-sync/commands
mkdir -p claude-config-sync/scripts
```

**Step 2: 编写 plugin.json**

```json
{
  "name": "claude-config-sync",
  "version": "0.1.0",
  "description": "Claude Code 配置同步工具，通过 GitHub/GitLab 实现跨机器同步",
  "author": {
    "name": "Zhai Wenjia"
  },
  "keywords": ["sync", "config", "github", "gitlab"]
}
```

**Step 3: 编写 marketplace.json**

```json
{
  "name": "claude-config-sync-dev",
  "description": "Development marketplace for claude-config-sync",
  "owner": {
    "name": "Zhai Wenjia"
  },
  "plugins": [{
    "name": "claude-config-sync",
    "description": "Claude Code 配置同步工具",
    "version": "0.1.0",
    "source": "./",
    "author": {
      "name": "Zhai Wenjia"
    }
  }]
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: 初始化插件结构"
```

---

### Task 2: 实现 claude-sync 命令

**Files:**
- Create: `claude-config-sync/commands/claude-sync.md`

**Step 1: 创建命令定义**

根据设计文档，`/claude-sync` 需要显示选择菜单：

```markdown
---
description: Claude Code 配置同步工具 - push 配置到远程 / create 从远程拉取配置
---

# Claude Config Sync

Claude Code 配置同步工具，通过 GitHub/GitLab 实现跨机器同步。

## 选项

1. **push global** → 上传 global 配置到远程仓库（默认）
2. **push local** → 上传 local 配置到当前代码仓
3. **create global** → 从远程下载 global 配置到 ~/.claude/
4. **create local** → 从远程下载 local 配置到当前代码仓（自动引导创建仓库）

## 使用场景

- `/claude-sync push` - 保存当前 global 配置
- `/claude-sync push local` - 保存当前项目的 local 配置
- `/claude-sync create` - 恢复 global 配置
- `/claude-sync create local` - 恢复当前项目的配置

## 配置分层

| 配置 | 来源 | 目的地 |
|------|------|--------|
| global | ~/.claude/（不含 CLAUDE.md） | claude-code-config-sync/global/ |
| local | .claude/ + CLAUDE.md | claude-code-config-sync/local/ |

## 合并策略

- 文件不存在 → 新增
- 文件存在且相同 → 跳过
- 文件存在且不同 → **由 Claude Code CLI 内置 LLM 分析差异，增量更新到远程**
- **覆盖确认**：远程有同名配置时，询问用户确认覆盖 / 否认终止
```

**Step 2: Commit**

```bash
git add commands/claude-sync.md
git commit -m "feat: 添加 /claude-sync 命令"
```

---

### Task 3: 实现 config-sync Skill

**Files:**
- Create: `claude-config-sync/skills/config-sync/SKILL.md`

**Step 1: 创建 Skill 定义**

```markdown
---
name: config-sync
description: 使用 Claude Code 配置同步工具 - push 配置到远程或从远程 create 配置
---

# Claude Config Sync Skill

## Overview

Claude Code 配置同步工具，通过 GitHub/GitLab 实现跨机器同步配置。

## 核心概念

### 配置分层

- **global 配置**: `~/.claude/`（不含 CLAUDE.md）
- **local 配置**: 当前代码仓的 `.claude/` 和 `CLAUDE.md`

### 同步方向

**push（上传统一仓库）:**
- `~/.claude/`（不含 CLAUDE.md）→ `github.com/{user}/claude-code-config-sync/global/`
- 当前代码仓的 `.claude/` + `CLAUDE.md` → `github.com/{user}/claude-code-config-sync/local/`

**create（下载到本地）:**
- `github.com/{user}/claude-code-config-sync/global/` → `~/.claude/`（默认）
- `github.com/{user}/claude-code-config-sync/local/` → 当前代码仓（--local）

## 使用方式

用户输入 `/claude-sync` 后选择：
- `push` / `push global` - 上传 global 配置（默认）
- `push local` - 上传 local 配置
- `create` / `create global` - 下载 global 配置（默认）
- `create local` - 下载 local 配置（交互式引导）

## 合并策略

1. 文件不存在 → 新增
2. 文件存在且相同 → 跳过
3. 文件存在且不同 → **调用 Claude Code CLI 内置 LLM 分析差异，增量更新到远程**
4. **覆盖确认**：远程有同名配置时，询问用户确认覆盖 / 否认终止

## manifest.json

同步时记录依赖信息：

```json
{
  "mcps": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  },
  "plugins": ["anthropics/claude-code"],
  "lastSync": "2026-05-03T10:00:00Z"
}
```

## 执行流程

### push 流程

1. 检测平台（GitHub/GitLab）
2. 获取凭证
3. 遍历配置目录
4. 对每个文件执行合并策略
5. 提交到远程

### create 流程

1. 检测平台
2. 获取凭证
3. 检测远程配置
4. 前置检查（覆盖确认）
5. 拉取配置
6. 安装依赖（manifest.json）
```

**Step 2: Commit**

```bash
git add skills/config-sync/SKILL.md
git commit -m "feat: 添加 config-sync skill"
```

---

## Phase 2: Git 操作核心功能

### Task 4: 创建 Git 操作辅助脚本

**Files:**
- Create: `claude-config-sync/scripts/push-config.sh`
- Create: `claude-config-sync/scripts/create-config.sh`

**Step 1: 创建 push 脚本**

```bash
#!/bin/bash
set -e

# Claude Config Sync - Push Configuration
# 用法: ./push-config.sh <global|local> <repo-url>

SCOPE="$1"
REPO_URL="$2"
CONFIG_REPO="claude-code-config-sync"
GITEA_API="https://api.github.com"
GH_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ 未找到 GITHUB_TOKEN 环境变量"
  exit 1
fi

echo "🔄 开始推送 $SCOPE 配置..."

# 实现 Git 操作逻辑
# 1. 检测并创建仓库（如果不存在）
# 2. 遍历配置目录
# 3. 提交并推送

echo "✅ 配置已推送到远程仓库"
```

**Step 2: 创建 create 脚本**

```bash
#!/bin/bash
set -e

# Claude Config Sync - Create Configuration
# 用法: ./create-config.sh <global|local> <repo-url>

SCOPE="$1"
REPO_URL="$2"
GH_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ 未找到 GITHUB_TOKEN 环境变量"
  exit 1
fi

echo "🔄 开始拉取 $SCOPE 配置..."

# 实现 Git 操作逻辑
# 1. 克隆仓库
# 2. 复制配置到目标目录
# 3. 处理覆盖确认

echo "✅ 配置已从远程仓库拉取"
```

**Step 3: 设置执行权限**

```bash
chmod +x scripts/push-config.sh
chmod +x scripts/create-config.sh
```

**Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: 添加 Git 操作辅助脚本"
```

---

## Phase 3: GitHub API 集成

### Task 5: 实现 GitHub 仓库自动创建

**Files:**
- Create: `claude-config-sync/scripts/create-repo.sh`

**Step 1: 创建仓库创建脚本**

```bash
#!/bin/bash
# 自动创建 GitHub 私有仓库
# 用法: ./create-repo.sh <repo-name>

REPO_NAME="${1:-claude-code-config-sync}"
GH_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ 未找到 GITHUB_TOKEN"
  exit 1
fi

curl -s -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"private\":true}" | jq -r '.html_url // empty'
```

**Step 2: 设置执行权限并提交**

```bash
chmod +x scripts/create-repo.sh
git add scripts/create-repo.sh
git commit -m "feat: 添加 GitHub 仓库自动创建脚本"
```

---

## Phase 4: 验证和发布准备

### Task 6: 安装测试

**Step 1: 本地安装测试**

```bash
# 在插件目录
/plugin marketplace add $(pwd)
```

**Step 2: 安装插件**

```bash
/plugin install claude-config-sync@claude-config-sync-dev
```

**Step 3: 重启 Claude Code 并测试**

```
/claude-sync
```

**Step 4: 如果有问题，调试并修复**

根据 troubleshooting.md 进行调试。

**Step 5: 提交测试结果**

```bash
git add .
git commit -m "test: 验证插件功能"
```

---

## Task 7: 发布准备

**Step 1: 更新版本**

```bash
# 更新 plugin.json 中的 version
```

**Step 2: 编写完整 README**

```markdown
# Claude Config Sync

Claude Code 配置同步工具，通过 GitHub/GitLab 实现跨机器同步。

## 安装

/plugin marketplace add zhaiwenjia/claude-code-config-sync
/plugin install claude-config-sync

## 使用

/claude-sync push - 上传配置
/claude-sync create - 下载配置
```

**Step 3: 提交发布版本**

```bash
git add .
git commit -m "Release v0.1.0"
git tag v0.1.0
git push origin master
git push origin v0.1.0
```

---

## 执行选项

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?