# Claude Config Sync

[![npm](https://img.shields.io/npm/v/@zhaiwenjia/claude-config-sync-mcp)](https://www.npmjs.com/package/@zhaiwenjia/claude-config-sync-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@zhaiwenjia/claude-config-sync-mcp)](https://www.npmjs.com/package/@zhaiwenjia/claude-config-sync-mcp)
[![中文文档](https://img.shields.io/badge/中文文档-readme_zh-blue?style=social)](readme_zh.md)

A Claude Code plugin for synchronizing configuration across GitHub or GitLab.

## Features

- **Layered Configuration**: Supports global (~/.claude/) and local (in-repo) configurations
- **Dual Platform Support**: Works with both GitHub and GitLab
- **Smart Merge**: Differential processing to avoid overwriting important configs

## Architecture

- **Plugin**: Claude Code plugin defining slash commands and Skills
- **MCP Server**: `@zhaiwenjia/claude-config-sync-mcp`, provides actual git operation tools

## Installation

```bash
/plugin marketplace add zhaiwenjia/claude-code-config-sync
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

## Updating

### Update the plugin

```bash
/plugin marketplace update zhaiwenjia/claude-code-config-sync
```

Or reinstall:

```bash
/plugin remove claude-config-sync
/plugin install claude-config-sync
```

### Update the MCP package

```bash
npm install -g @zhaiwenjia/claude-config-sync-mcp
```

## License

MIT
