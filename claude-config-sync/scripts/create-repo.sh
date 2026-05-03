#!/bin/bash
# 自动创建 GitHub 私有仓库
# 用法: ./create-repo.sh <repo-name>

REPO_NAME="${1:-claude-code-config-sync}"
GH_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GH_TOKEN" ]; then
  echo "❌ 未找到 GITHUB_TOKEN"
  exit 1
fi

curl -s -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"private\":true}" | jq -r '.html_url // empty'