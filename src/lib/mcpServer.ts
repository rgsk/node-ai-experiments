import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import saveUserInfoToMemory from "routers/children/assistants/tools/saveUserInfoToMemory";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "Node AI Experiments MCP Server",
  version: "1.0.0",
});

server.tool(
  "saveUserInfoToMemory",
  "Save any information the user reveals about themselves during conversations — this includes their preferences, interests, goals, plans, likes/dislikes, personality traits, or anything relevant that can help personalize future conversations.",
  {
    statement: z.string({
      description:
        "A concise statement that captures the information to be saved (e.g., 'User plans to start an AI & robotics company', 'User likes sci-fi movies', 'User works at Google').",
    }),
    userEmail: z.string().email(),
  },
  async ({ statement, userEmail }) => {
    const result = await saveUserInfoToMemory({ statement, userEmail });
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }
);

(async () => {
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();
