---
description: Claude Code 配置同步工具 - push 配置到远程 / pull 从远程拉取配置
---

# Claude Config Sync

Claude Code 配置同步工具，通过 GitHub 或 GitLab 实现配置管理。

## 选项

1. **push global** → 上传 global 配置到远程仓库
2. **push local** → 上传 local 配置到当前代码仓
3. **pull global** → 从远程下载 global 配置到 ~/.claude/
4. **pull local** → 从远程下载 local 配置到当前代码仓

## 使用场景

- `/claude-sync push global` - 上传 global 配置
- `/claude-sync push local` - 上传 local 配置
- `/claude-sync pull global` - 下载 global 配置
- `/claude-sync pull local` - 下载 local 配置

## 配置分层

| 配置 | 来源 | 目的地 |
|------|------|--------|
| global | ~/.claude/（不含 CLAUDE.md） | claude-code-config-sync/global/ |
| local | .claude/ + CLAUDE.md | claude-code-config-sync/local/ |

## 环境变量

- `GITHUB_TOKEN` - GitHub 访问令牌
- `GITLAB_TOKEN` - GitLab 访问令牌