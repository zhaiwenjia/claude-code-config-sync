---
name: config-sync
description: 使用 Claude Code 配置同步工具 - push 配置到远程或 pull 从远程拉取配置
---

# Claude Config Sync Skill

## Overview

Claude Code 配置同步工具，通过 GitHub 或 GitLab 实现配置管理。

## 核心概念

### 配置分层

- **global 配置**: `~/.claude/`（不含 CLAUDE.md）
- **local 配置**: 当前代码仓的 `.claude/` 和 `CLAUDE.md`

### 同步方向

**push（上传统一仓库）:**
- `~/.claude/`（不含 CLAUDE.md）→ `github.com/{user}/claude-code-config-sync/global/`
- 当前代码仓的 `.claude/` + `CLAUDE.md` → `github.com/{user}/claude-code-config-sync/local/`

**pull（下载到本地）:**
- `github.com/{user}/claude-code-config-sync/global/` → `~/.claude/`
- `github.com/{user}/claude-code-config-sync/local/` → 当前代码仓

## 使用方式

用户输入 `/claude-sync` 后选择：
- `push global` - 上传 global 配置
- `push local` - 上传 local 配置
- `pull global` - 下载 global 配置
- `pull local` - 下载 local 配置

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

### pull 流程

1. 检测平台
2. 获取凭证
3. 检测远程配置
4. 前置检查（覆盖确认）
5. 拉取配置
6. 安装依赖（manifest.json）
