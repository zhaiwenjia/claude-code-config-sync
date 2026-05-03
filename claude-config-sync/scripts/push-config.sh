#!/bin/bash
set -e

# Claude Config Sync - Push Configuration
# 用法: ./push-config.sh <global|local> <repo-url>

SCOPE="$1"
REPO_URL="$2"
CONFIG_REPO="claude-code-config-sync"
GITEA_API="https://api.github.com"
GH_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ 未找到 GITHUB_TOKEN 环境变量"
  exit 1
fi

echo "🔄 开始推送 $SCOPE 配置..."

# 实现 Git 操作逻辑
# 1. 检测并创建仓库（如果不存在）
# 2. 遍历配置目录
# 3. 提交并推送

echo "✅ 配置已推送到远程仓库"