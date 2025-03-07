import { schemaToTools } from "lib/generalUtils";

const sampleInputSchema = {
  tools: [
    {
      name: "saveUserInfoToMemory",
      description:
        "Save any information the user reveals about themselves during conversations — this includes their preferences, interests, goals, plans, likes/dislikes, personality traits, or anything relevant that can help personalize future conversations.",
      inputSchema: {
        type: "object",
        properties: {
          statement: {
            type: "string",
            description:
              "A concise statement that captures the information to be saved (e.g., 'User plans to start an AI & robotics company', 'User likes sci-fi movies', 'User works at Google').",
          },
          userEmail: { type: "string" },
        },
        required: ["statement", "userEmail"],
        additionalProperties: false,
        $schema: "http://json-schema.org/draft-07/schema#",
      },
    },
  ],
};

const practice = async () => {
  //   const tools = await mcpClient.listTools();
  //   console.log(tools);
  const tool = schemaToTools(sampleInputSchema);
  //   console.log(tool);
  //   console.log(JSON.stringify(tool, null, 2));
  console.dir(tool, { depth: null });
};
practice();
