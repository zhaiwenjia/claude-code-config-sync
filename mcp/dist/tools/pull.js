import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import os from "os";
import { detectPlatformFromUrl, parseGitUrl, getToken, getConfigRepoUrl, getGlobalConfigPath, getLocalConfigPath, ensureDir, } from "../platform.js";
const CONFIG_REPO = "claude-code-config-sync";
const TEMP_DIR = path.join(os.tmpdir(), CONFIG_REPO);
export async function gitPull(scope) {
    let token = "";
    try {
        // 1. 获取当前仓库的远程 URL
        const git = simpleGit();
        const remotes = await git.getRemotes(true);
        const originRemote = remotes.find((r) => r.name === "origin");
        const remoteUrl = originRemote?.refs?.fetch || originRemote?.refs?.push;
        if (!remoteUrl) {
            return {
                content: [{ type: "text", text: "错误: 未找到 origin 远程仓库" }],
                isError: true,
            };
        }
        // 2. 检测平台并获取凭证
        const platform = detectPlatformFromUrl(remoteUrl);
        token = getToken(platform);
        const { owner } = parseGitUrl(remoteUrl);
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `错误: ${sanitizeErrorMessage(errorMessage, token)}` }],
            isError: true,
        };
    }
}
function setAuthUrl(url, token, platform) {
    if (platform === "github") {
        return url.replace("https://", `https://x-access-token:${token}@`);
    }
    else {
        const parsed = new URL(url);
        parsed.username = "oauth2";
        parsed.password = token;
        return parsed.toString();
    }
}
async function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
function sanitizeErrorMessage(message, token) {
    if (!token)
        return message;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return message.replace(new RegExp(escapedToken, "g"), "***");
}
