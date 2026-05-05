# Claude Config Sync

Claude Code 配置同步插件，通过 GitHub 或 GitLab 实现配置管理。

## 功能

- **配置分层**: 支持 global（~/.claude/）和 local（代码仓内）两种配置
- **双平台支持**: 支持 GitHub 和 GitLab
- **智能合并**: 本地差异化处理，避免覆盖重要配置

## 技术架构

- **插件**: Claude Code 插件，定义 slash command 和 Skill
- **MCP 服务器**: `@zhaiwenjia/claude-config-sync-mcp`，提供实际的 git 操作工具

## 安装

```bash
/plugin marketplace add zhaiwenjia/claude-code-config-sync
/plugin install claude-config-sync
```

安装插件后，MCP 服务器会自动下载安装。

## 使用

### 上传配置 (push)

```bash
/claude-sync push global  # 上传 global 配置
/claude-sync push local   # 上传 local 配置
```

### 下载配置 (pull)

```bash
/claude-sync pull global  # 下载 global 配置
/claude-sync pull local   # 下载 local 配置
```

## 配置说明

| 类型 | 来源 | 目的地 |
|------|------|--------|
| global | ~/.claude/（不含 CLAUDE.md） | claude-code-config-sync/global/ |
| local | .claude/ + CLAUDE.md | claude-code-config-sync/local/ |

## 更新插件

```bash
/plugin marketplace update zhaiwenjia/claude-code-config-sync
```

或者重新安装：

```bash
/plugin remove claude-config-sync
/plugin install claude-config-sync
```

### 更新 MCP 包

```bash
npm install -g @zhaiwenjia/claude-config-sync-mcp
```

## 许可

MIT
