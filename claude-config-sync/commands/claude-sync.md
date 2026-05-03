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