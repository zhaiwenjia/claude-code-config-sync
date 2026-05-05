# Claude Config Sync MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 实现 MCP 服务器，提供完整的 git push/pull 工具，支持 GitHub/GitLab 双平台

**Architecture:**
- MCP 服务器使用 TypeScript 实现，基于 @modelcontextprotocol/sdk
- 通过 simple-git 进行 Git 操作
- 平台检测通过远程 URL 自动识别（github.com/gitlab.com）
- MCP 通过 npx 从 npm 包 `@laozhai/claude-config-sync-mcp` 启动

**Tech Stack:**
- TypeScript
- @modelcontextprotocol/sdk (MCP)
- simple-git (Git 操作)

---

## Task 1: 创建 MCP 项目结构

**Files:**
- Create: `mcp/package.json`
- Create: `mcp/tsconfig.json`
- Create: `mcp/src/index.ts`
- Create: `mcp/src/tools/index.ts`

**Step 1: 创建目录**

```bash
mkdir -p mcp/src/tools
```

**Step 2: 创建 package.json**

```json
{
  "name": "@laozhai/claude-config-sync-mcp",
  "version": "0.1.0",
  "description": "Claude Config Sync MCP Server - Git push/pull for Claude Code",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "prepublish": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "simple-git": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Step 4: 创建 src/tools/index.ts**

```typescript
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const gitPushTool: Tool = {
  name: "git_push",
  description: "Push Claude Code configuration to remote repository. Uploads global (~/.claude) or local (.claude) configurations to the config sync repository.",
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["global", "local"],
        description: "Configuration scope: 'global' for ~/.claude or 'local' for .claude"
      }
    },
    required: ["scope"]
  }
};

export const gitPullTool: Tool = {
  name: "git_pull",
  description: "Pull Claude Code configuration from remote repository. Downloads global or local configurations from the config sync repository to local.",
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["global", "local"],
        description: "Configuration scope: 'global' for ~/.claude or 'local' for .claude"
      }
    },
    required: ["scope"]
  }
};
```

**Step 5: 创建 src/index.ts**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { gitPushTool, gitPullTool } from "./tools/index.js";
import { gitPush } from "./tools/push.js";
import { gitPull } from "./tools/pull.js";

const server = new Server(
  { name: "claude-config-sync-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [gitPushTool, gitPullTool]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "git_push") {
    return await gitPush(args.scope as "global" | "local");
  }
  if (name === "git_pull") {
    return await gitPull(args.scope as "global" | "local");
  }

  return { content: [{ type: "text", text: "Unknown tool" }], isError: true };
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
```

**Step 6: Commit**

```bash
git add mcp/
git commit -m "feat: 初始化 MCP 项目结构"
```

---

## Task 2: 修复 plugin.json 和 marketplace.json

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

**Step 1: 写入正确的 plugin.json**

```json
{
  "name": "claude-config-sync",
  "version": "0.1.0",
  "description": "Claude Code 配置同步工具，通过 GitHub/GitLab 实现配置管理",
  "author": {
    "name": "Zhai Wenjia"
  },
  "keywords": ["sync", "config", "github", "gitlab"],
  "mcpServers": {
    "claude-config-sync": {
      "command": "npx",
      "args": ["@laozhai/claude-config-sync-mcp"]
    }
  }
}
```

**Step 2: 写入正确的 marketplace.json**

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

**Step 3: Commit**

```bash
git add .claude-plugin/
git commit -m "fix: 修正 plugin.json 和 marketplace.json 配置"
```

---

## Task 3: 实现平台检测和凭证管理

**Files:**
- Create: `mcp/src/platform.ts`

**Step 1: 创建 platform.ts**

```typescript
import fs from "fs";
import path from "path";
import os from "os";

export type Platform = "github" | "gitlab";

export interface PlatformConfig {
  platform: Platform;
  configRepoUrl: string;
  token: string;
  owner: string;
  repo: string;
}

export function detectPlatformFromUrl(url: string): Platform {
  if (url.includes("gitlab.com") || url.includes("gitlab")) {
    return "gitlab";
  }
  return "github";
}

export function parseGitUrl(remoteUrl: string): { owner: string; repo: string } {
  // Handle SSH format: git@github.com:owner/repo.git
  // Handle HTTPS format: https://github.com/owner/repo.git
  const sshMatch = remoteUrl.match(/git@[^:]+:([^/]+)\/([^/.]+)/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  const httpsMatch = remoteUrl.match(/:\/\/[^/]+\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  throw new Error(`无法解析 Git URL: ${remoteUrl}`);
}

export function getToken(platform: Platform): string {
  const envKey = platform === "github" ? "GITHUB_TOKEN" : "GITLAB_TOKEN";
  const token = process.env[envKey];
  if (!token) {
    throw new Error(`未找到 ${envKey} 环境变量，请先设置`);
  }
  return token;
}

export function getConfigRepoUrl(platform: Platform, owner: string): string {
  const baseUrl = platform === "github"
    ? `https://github.com/${owner}/claude-code-config-sync.git`
    : `https://gitlab.com/${owner}/claude-code-config-sync.git`;
  return baseUrl;
}

export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), ".claude");
}

export function getLocalConfigPath(): string {
  return path.join(process.cwd(), ".claude");
}

export function configExists(configPath: string): boolean {
  return fs.existsSync(configPath);
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
```

**Step 2: Commit**

```bash
git add mcp/src/platform.ts
git commit -m "feat: 实现平台检测和凭证管理"
```

---

## Task 4: 实现 git_push 完整功能

**Files:**
- Create: `mcp/src/tools/push.ts`

**Step 1: 创建 src/tools/push.ts**

```typescript
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { simpleGit, SimpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";
import {
  detectPlatformFromUrl,
  parseGitUrl,
  getToken,
  getConfigRepoUrl,
  getGlobalConfigPath,
  getLocalConfigPath,
  configExists,
  ensureDir,
} from "../platform.js";

const CONFIG_REPO = "claude-code-config-sync";
const TEMP_DIR = path.join(os.tmpdir(), CONFIG_REPO);

export async function gitPush(scope: "global" | "local"): Promise<CallToolResult> {
  try {
    // 1. 获取当前仓库的远程 URL
    const git: SimpleGit = simpleGit();
    const remotes = await git.getRemotes(true);
    const originRemote = remotes.find((r) => r.name === "origin");

    if (!originRemote?.url) {
      return {
        content: [{ type: "text", text: "错误: 未找到 origin 远程仓库" }],
        isError: true,
      };
    }

    // 2. 检测平台并获取凭证
    const platform = detectPlatformFromUrl(originRemote.url);
    const token = getToken(platform);
    const { owner } = parseGitUrl(originRemote.url);
    const configRepoUrl = getConfigRepoUrl(platform, owner);

    // 3. 确定配置源路径
    const configPath = scope === "global"
      ? getGlobalConfigPath()
      : getLocalConfigPath();

    // 验证配置目录存在
    if (!configExists(configPath)) {
      return {
        content: [{ type: "text", text: `错误: ${scope} 配置目录不存在: ${configPath}` }],
        isError: true,
      };
    }

    // 4. 克隆或更新配置仓库
    const targetDir = path.join(TEMP_DIR, `${scope}-${Date.now()}`);
    ensureDir(path.dirname(targetDir));

    const configGit: SimpleGit = simpleGit();

    // 设置认证的远程 URL
    const authUrl = setAuthUrl(configRepoUrl, token, platform);

    try {
      // 尝试克隆现有仓库
      await configGit.clone(authUrl, targetDir, ["--depth", "1"]);
    } catch {
      // 如果克隆失败，可能是仓库不存在，创建新仓库
      fs.mkdirSync(targetDir, { recursive: true });
      await configGit.cwd(targetDir);
      await configGit.init();
      await configGit.addRemote("origin", authUrl);
    }

    // 5. 复制配置到仓库
    const scopeDir = scope; // "global" or "local"
    const destDir = path.join(targetDir, scopeDir);

    // 复制配置目录
    await copyDirectory(configPath, destDir);

    // 6. 提交并推送
    await configGit.cwd(targetDir);
    await configGit.add(".");

    const status = await configGit.status();
    if (status.files.length === 0) {
      // 清理临时目录
      fs.rmSync(targetDir, { recursive: true, force: true });
      return {
        content: [{ type: "text", text: `✓ ${scope} 配置已是最新，无需更新` }],
      };
    }

    await configGit.commit(`chore: sync ${scope} config ${new Date().toISOString()}`);

    // 设置远程 URL（带认证）
    await configGit.remote(["set-url", "origin", authUrl]);

    await configGit.push(["-u", "origin", "main", "--force"]);

    // 如果是首次推送，可能需要设置默认分支
    try {
      await configGit.push(["--set-upstream", "origin", "main"]);
    } catch {
      // 分支已设置，忽略错误
    }

    // 7. 清理临时目录
    fs.rmSync(targetDir, { recursive: true, force: true });

    return {
      content: [{ type: "text", text: `✓ ${scope} 配置已成功推送到 ${platform} 仓库` }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `错误: ${errorMessage}` }],
      isError: true,
    };
  }
}

function setAuthUrl(url: string, token: string, platform: "github" | "gitlab"): string {
  if (platform === "github") {
    // GitHub: 使用 HTTPS + token
    return url.replace("https://", `https://x-access-token:${token}@`);
  } else {
    // GitLab: 使用 HTTPS + token 作为密码
    const parsed = new URL(url);
    parsed.username = "oauth2";
    parsed.password = token;
    return parsed.toString();
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // 跳过 CLAUDE.md（local 配置不包含）
    if (entry.name === "CLAUDE.md" && src.includes(".claude")) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
```

**Step 2: Commit**

```bash
git add mcp/src/tools/push.ts
git commit -m "feat: 实现 git_push 完整功能"
```

---

## Task 5: 实现 git_pull 完整功能

**Files:**
- Create: `mcp/src/tools/pull.ts`

**Step 1: 创建 src/tools/pull.ts**

```typescript
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { simpleGit, SimpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";
import {
  detectPlatformFromUrl,
  parseGitUrl,
  getToken,
  getConfigRepoUrl,
  getGlobalConfigPath,
  getLocalConfigPath,
  ensureDir,
} from "../platform.js";

const CONFIG_REPO = "claude-code-config-sync";
const TEMP_DIR = path.join(os.tmpdir(), CONFIG_REPO);

export async function gitPull(scope: "global" | "local"): Promise<CallToolResult> {
  try {
    // 1. 获取当前仓库的远程 URL
    const git: SimpleGit = simpleGit();
    const remotes = await git.getRemotes(true);
    const originRemote = remotes.find((r) => r.name === "origin");

    if (!originRemote?.url) {
      return {
        content: [{ type: "text", text: "错误: 未找到 origin 远程仓库" }],
        isError: true,
      };
    }

    // 2. 检测平台并获取凭证
    const platform = detectPlatformFromUrl(originRemote.url);
    const token = getToken(platform);
    const { owner } = parseGitUrl(originRemote.url);
    const configRepoUrl = getConfigRepoUrl(platform, owner);

    // 3. 确定配置目标路径
    const configPath = scope === "global"
      ? getGlobalConfigPath()
      : getLocalConfigPath();

    // 4. 克隆配置仓库到临时目录
    const targetDir = path.join(TEMP_DIR, `${scope}-${Date.now()}`);
    ensureDir(path.dirname(targetDir));

    // 设置认证的远程 URL
    const authUrl = setAuthUrl(configRepoUrl, token, platform);

    // 克隆仓库
    await simpleGit().clone(authUrl, targetDir);

    // 5. 从仓库复制配置到目标路径
    const sourceDir = path.join(targetDir, scope);

    if (!fs.existsSync(sourceDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      return {
        content: [{ type: "text", text: `错误: 远程仓库中不存在 ${scope} 配置` }],
        isError: true,
      };
    }

    // 如果目标目录已存在，备份
    if (fs.existsSync(configPath)) {
      const backupDir = `${configPath}.backup-${Date.now()}`;
      fs.renameSync(configPath, backupDir);
    }

    // 确保目标父目录存在
    ensureDir(path.dirname(configPath));

    // 复制配置
    await copyDirectory(sourceDir, configPath);

    // 6. 清理临时目录
    fs.rmSync(targetDir, { recursive: true, force: true });

    return {
      content: [{ type: "text", text: `✓ ${scope} 配置已从 ${platform} 仓库拉取到 ${configPath}` }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `错误: ${errorMessage}` }],
      isError: true,
    };
  }
}

function setAuthUrl(url: string, token: string, platform: "github" | "gitlab"): string {
  if (platform === "github") {
    return url.replace("https://", `https://x-access-token:${token}@`);
  } else {
    const parsed = new URL(url);
    parsed.username = "oauth2";
    parsed.password = token;
    return parsed.toString();
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
```

**Step 2: Commit**

```bash
git add mcp/src/tools/pull.ts
git commit -m "feat: 实现 git_pull 完整功能"
```

---

## Task 6: 清理废弃的 shell 脚本

**Files:**
- Delete: `scripts/push-config.sh`
- Delete: `scripts/create-config.sh`
- Delete: `scripts/create-repo.sh`
- Delete: `scripts/` 目录（如为空）

**Step 1: 删除 shell 脚本**

```bash
rm -f scripts/push-config.sh scripts/create-config.sh scripts/create-repo.sh
rmdir scripts 2>/dev/null || true
```

**Step 2: Commit**

```bash
git add .
git commit -m "chore: 清理废弃的 shell 脚本"
```

---

## Task 7: 构建和验证 MCP 服务器

**Files:**
- Build: `mcp/dist/`

**Step 1: 安装依赖并构建**

```bash
cd mcp
npm install
npm run build
```

**Step 2: 验证构建结果**

```bash
ls -la dist/
cat dist/index.js | head -20
```

**Step 3: Commit 构建结果（如果需要跟踪）**

```bash
# 如果 .gitignore 排除了 dist，不需要跟踪
# 如果需要跟踪，添加并提交
```

---

## Task 8: 更新 Skill 和 Command 文档

**Files:**
- Modify: `skills/config-sync/SKILL.md`
- Modify: `commands/claude-sync.md`

**Step 1: 更新 SKILL.md**

```markdown
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
```

**Step 2: 更新 claude-sync.md**

```markdown
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
```

**Step 3: Commit**

```bash
git add skills/ commands/
git commit -m "docs: 更新 Skill 和 Command 文档"
```

---

## Task 9: 配置 npm 发布并打标签

**Files:**
- Modify: `mcp/package.json` (添加 publishConfig)

**Step 1: 更新 package.json 添加发布配置**

```json
{
  "name": "@laozhai/claude-config-sync-mcp",
  "version": "0.1.0",
  "description": "Claude Config Sync MCP Server - Git push/pull for Claude Code",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "prepublish": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "simple-git": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/laozhai/claude-code-config-sync.git"
  },
  "keywords": ["mcp", "claude", "config", "sync", "git"]
}
```

**Step 2: Commit 并创建标签**

```bash
git add mcp/package.json
git commit -m "release: v0.1.0"
git tag v0.1.0
git push origin master
git push origin v0.1.0
```

---

## 执行选项

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?