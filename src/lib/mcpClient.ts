import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
const transport = new StdioClientTransport({
  command: "node",
  args: [path.join("dist", "lib", "mcpServer.js")],
  env: process.env as any,
});

const mcpClient = new Client(
  {
    name: "node-ai-experiments-mcp-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

(async () => {
  await mcpClient.connect(transport);
})();
export default mcpClient;
