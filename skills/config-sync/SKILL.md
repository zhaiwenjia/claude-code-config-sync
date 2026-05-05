---
name: config-sync
description: 使用 Claude Code 配置同步工具 - push 配置到远程或 pull 从远程拉取配置
---

# Claude Config Sync Skill

## Overview

Claude Code 配置同步工具，通过 GitHub 或 GitLab 实现配置管理。

## MCP 工具

此插件提供以下 MCP 工具：
- `git_push` - 上传配置到远程仓库
- `git_pull` - 从远程仓库下载配置

## 配置分层

- **global 配置**: `~/.claude/`（不含 CLAUDE.md）
- **local 配置**: 当前代码仓的 `.claude/` 和 `CLAUDE.md`

## 使用方式

用户输入 `/claude-sync` 后选择：
- `push global` - 使用 git_push 工具上传 global 配置
- `push local` - 使用 git_push 工具上传 local 配置
- `pull global` - 使用 git_pull 工具下载 global 配置
- `pull local` - 使用 git_pull 工具下载 local 配置

## 执行流程

### push 流程

1. 调用 `git_push` 工具，参数 `scope: "global" | "local"`
2. 工具自动检测平台（GitHub/GitLab）
3. 获取凭证（GITHUB_TOKEN 或 GITLAB_TOKEN）
4. 克隆配置仓库
5. 复制配置到仓库对应目录
6. 提交并推送

### pull 流程

1. 调用 `git_pull` 工具，参数 `scope: "global" | "local"`
2. 工具自动检测平台
3. 获取凭证
4. 克隆配置仓库
5. 复制配置到目标路径
6. 清理临时文件