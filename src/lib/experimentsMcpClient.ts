import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import environmentVars from "./environmentVars.js";
export const experimentsMcpTransport = new SSEClientTransport(
  new URL(environmentVars.MCP_AI_EXPERIMENTS_SERVER + "/sse")
);

const experimentsMcpClient = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);
export type McpClient = typeof experimentsMcpClient;
(async () => {
  await experimentsMcpClient.connect(experimentsMcpTransport);
})();
export default experimentsMcpClient;
