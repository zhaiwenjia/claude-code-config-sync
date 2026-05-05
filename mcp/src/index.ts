import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { gitPushTool, gitPullTool } from "./tools/index.js";

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
    // Will be implemented in Task 4
    return { content: [{ type: "text", text: "git_push not yet implemented" }], isError: true };
  }
  if (name === "git_pull") {
    // Will be implemented in Task 5
    return { content: [{ type: "text", text: "git_pull not yet implemented" }], isError: true };
  }

  return { content: [{ type: "text", text: "Unknown tool" }], isError: true };
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);