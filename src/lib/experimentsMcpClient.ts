import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import environmentVars from "./environmentVars";
console.log(environmentVars.MCP_AI_EXPERIMENTS_SERVER);
const transport = new SSEClientTransport(
  new URL(environmentVars.MCP_AI_EXPERIMENTS_SERVER)
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

(async () => {
  await experimentsMcpClient.connect(transport);
})();
export default experimentsMcpClient;
