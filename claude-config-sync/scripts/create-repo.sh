#!/bin/bash
set -e

# 自动创建 GitHub 私有仓库
# 用法: ./create-repo.sh <repo-name>

REPO_NAME="${1:-claude-code-config-sync}"
GH_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ 未找到 GITHUB_TOKEN"
  exit 1
fi

# Validate repo name (alphanumeric, dots, hyphens, underscores)
if [[ ! "$REPO_NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "❌ 无效的仓库名: $REPO_NAME"
  exit 1
fi

response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"private\":true}")

http_code=$(echo "$response" | tail -c 3)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -ne 201 ]; then
  echo "❌ 创建仓库失败: $(echo "$body" | jq -r '.message // empty')"
  exit 1
fi

echo "$body" | jq -r '.html_url'