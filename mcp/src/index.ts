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
  const { name, arguments: args = {} } = request.params;

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