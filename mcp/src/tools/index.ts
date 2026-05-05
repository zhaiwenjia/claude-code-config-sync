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