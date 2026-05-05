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
  let token = "";

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
    token = getToken(platform);
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
    const destDir = path.join(targetDir, scope);

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

    // 检测当前分支名
    const branchName = await detectCurrentBranch()
      .catch(() => "master");

    // 推送到远程仓库
    await configGit.push(["-u", "origin", branchName]);

    // 7. 清理临时目录
    fs.rmSync(targetDir, { recursive: true, force: true });

    return {
      content: [{ type: "text", text: `✓ ${scope} 配置已成功推送到 ${platform} 仓库` }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedMessage = sanitizeErrorMessage(errorMessage, token);
    return {
      content: [{ type: "text", text: `错误: ${sanitizedMessage}` }],
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

async function detectCurrentBranch(): Promise<string> {
  const git: SimpleGit = simpleGit();
  const branch = await git.branch();
  return branch.current;
}

function sanitizeErrorMessage(message: string): string {
  // 移除可能的 token 信息
  return message
    .replace(/x-access-token:[^@]+@/g, "x-access-token:***@")
    .replace(/oauth2:[^@]+@/g, "oauth2:***@");
}