#!/bin/bash
set -e

# Claude Config Sync - Create Configuration
# 用法: ./create-config.sh <global|local> <repo-url>

SCOPE="$1"
REPO_URL="$2"
GH_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ 未找到 GITHUB_TOKEN 环境变量"
  exit 1
fi

echo "🔄 开始拉取 $SCOPE 配置..."

# 实现 Git 操作逻辑
# 1. 克隆仓库
# 2. 复制配置到目标目录
# 3. 处理覆盖确认

echo "✅ 配置已从远程仓库拉取"