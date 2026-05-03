# Claude Config Sync

Claude Code 配置同步工具，通过 GitHub/GitLab 实现跨机器同步。

## 功能

- **配置分层**: 支持 global（~/.claude/）和 local（代码仓内）两种配置
- **跨平台同步**: 通过 GitHub 或 GitLab 同步配置
- **智能合并**: 本地差异化处理，避免覆盖重要配置

## 安装

```bash
/plugin marketplace add zhaiwenjia/claude-code-config-sync
/plugin install claude-config-sync
```

## 使用

### 上传配置 (push)

```bash
/claude-sync push        # 上传 global 配置
/claude-sync push local  # 上传 local 配置
```

### 下载配置 (create)

```bash
/claude-sync create        # 下载 global 配置
/claude-sync create local  # 下载 local 配置
```

## 配置说明

| 类型 | 来源 | 目的地 |
|------|------|--------|
| global | ~/.claude/（不含 CLAUDE.md） | claude-code-config-sync/global/ |
| local | .claude/ + CLAUDE.md | claude-code-config-sync/local/ |

## 许可

MIT