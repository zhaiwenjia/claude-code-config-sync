# Claude Config Sync

[![npm](https://img.shields.io/npm/v/@laozhai/claude-config-sync-mcp)](https://www.npmjs.com/package/@laozhai/claude-config-sync-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@laozhai/claude-config-sync-mcp)](https://www.npmjs.com/package/@laozhai/claude-config-sync-mcp)
[![中文文档](https://img.shields.io/badge/中文文档-readme_zh-blue?style=social)](readme_zh.md)

A Claude Code plugin for synchronizing configuration across GitHub or GitLab.

## Features

- **Layered Configuration**: Supports global (~/.claude/) and local (in-repo) configurations
- **Dual Platform Support**: Works with both GitHub and GitLab
- **Smart Merge**: Differential processing to avoid overwriting important configs

## Architecture

- **Plugin**: Claude Code plugin defining slash commands and Skills
- **MCP Server**: `@laozhai/claude-config-sync-mcp`, provides actual git operation tools

## Installation

```bash
/plugin marketplace add laozhai/claude-code-config-sync
/plugin install claude-config-sync
```

The MCP server will be installed automatically.

## Usage

### Push Configuration

```bash
/claude-sync push global  # Push global config
/claude-sync push local   # Push local config
```

### Pull Configuration

```bash
/claude-sync pull global  # Pull global config
/claude-sync pull local   # Pull local config
```

## Configuration Reference

| Type | Source | Destination |
|------|--------|-------------|
| global | ~/.claude/ (excluding CLAUDE.md) | claude-code-config-sync/global/ |
| local | .claude/ + CLAUDE.md | claude-code-config-sync/local/ |

## Environment Variables

- `GITHUB_TOKEN` - GitHub access token
- `GITLAB_TOKEN` - GitLab access token

## License

MIT
