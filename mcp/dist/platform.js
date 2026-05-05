import fs from "fs";
import path from "path";
import os from "os";
export function detectPlatformFromUrl(url) {
    if (url.includes("gitlab.com") || url.includes("gitlab")) {
        return "gitlab";
    }
    return "github";
}
export function parseGitUrl(remoteUrl) {
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
export function getToken(platform) {
    const envKey = platform === "github" ? "GITHUB_TOKEN" : "GITLAB_TOKEN";
    const token = process.env[envKey];
    if (!token) {
        throw new Error(`未找到 ${envKey} 环境变量，请先设置`);
    }
    return token;
}
export function getConfigRepoUrl(platform, owner) {
    const baseUrl = platform === "github"
        ? `https://github.com/${owner}/claude-code-config-sync.git`
        : `https://gitlab.com/${owner}/claude-code-config-sync.git`;
    return baseUrl;
}
export function getGlobalConfigPath() {
    return path.join(os.homedir(), ".claude");
}
export function getLocalConfigPath() {
    return path.join(process.cwd(), ".claude");
}
export function configExists(configPath) {
    return fs.existsSync(configPath);
}
export function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
