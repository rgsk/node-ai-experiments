import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { v4 } from "uuid";
import { z } from "zod";
import getUrlContent from "../routers/children/assistants/tools/getUrlContent.js";
import { jsonDataService } from "../routers/children/jsonDataService.js";
import aiService from "./aiService.js";
import fileLogger from "./fileLogger.js";
import { html } from "./generalUtils.js";
import { Memory, Persona } from "./typesJsonData.js";

// Create an MCP server
const mcpServer = new McpServer({
  name: "Node AI Experiments MCP Server",
  version: "1.0.0",
});

mcpServer.resource(
  "userMemories",
  new ResourceTemplate("users://{userEmail}/memories", { list: undefined }),
  async (uri, args) => {
    fileLogger.log({
      resource: "userMemories",
      args,
    });
    const { userEmail } = args;
    const key = `reactAIExperiments/users/${userEmail}/memories`;

    const jsonData = await jsonDataService.findByKey<Memory[]>(key);
    const memories = jsonData?.value;
    const statements = memories?.map((m) => m.statement);
    fileLogger.log({
      resource: "userMemories",
      output: statements,
    });
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(statements),
        },
      ],
    };
  }
);

mcpServer.tool(
  "getRelevantDocs",
  "When you are acting as persona, this tool helps you to get the relevant docs to respond, for this persona data from various sources is collected like websites, pdfs, image texts. When you run this function, you get the relevant texts, which you can use as context to answer user query. This function performs RAG on texts of all those data sources.",
  {
    query: z.string({
      description: "A query based on which docs will be fetched.",
    }),
    personaId: z.string(),
    userEmail: z.string().email(),
    sources: z
      .string({ description: "filter by particular sources" })
      .array()
      .optional(),
    numDocs: z
      .number({ description: "num of documents to be fetched" })
      .optional(),
  },
  async (args) => {
    fileLogger.log({
      tool: "getRelevantDocs",
      args,
    });
    const { query, personaId, userEmail, numDocs, sources } = args;
    const result = await jsonDataService.findByKey<Persona>(
      `reactAIExperiments/users/${userEmail}/personas/${personaId}`
    );
    const persona = result?.value;
    if (!persona) {
      throw new Error("persona not found");
    }
    const relevantDocs = await aiService.getRelevantDocs({
      query: query,
      collectionName: persona.collectionName,
      numDocs,
      sources,
    });
    fileLogger.log({
      tool: "getRelevantDocs",
      output: relevantDocs,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(relevantDocs),
        },
      ],
    };
  }
);
mcpServer.tool(
  "saveUserInfoToMemory",
  "Save any information the user reveals about themselves during conversations — this includes their preferences, interests, goals, plans, likes/dislikes, personality traits, or anything relevant that can help personalize future conversations.",
  {
    statement: z.string({
      description:
        "A concise statement that captures the information to be saved (e.g., 'User plans to start an AI & robotics company', 'User likes sci-fi movies', 'User works at Google').",
    }),
    userEmail: z.string().email(),
  },
  async (args) => {
    fileLogger.log({
      tool: "saveUserInfoToMemory",
      args,
    });
    const { statement, userEmail } = args;
    const key = `reactAIExperiments/users/${userEmail}/memories`;
    const jsonData = await jsonDataService.findByKey<Memory[]>(key);
    const memory: Memory = {
      id: v4(),
      statement,
      createdAt: new Date().toISOString(),
    };
    if (!jsonData) {
      const jsonData = await jsonDataService.createOrUpdate({
        key: key,
        value: [memory],
      });
    } else {
      const memories = jsonData.value;
      const newJsonData = await jsonDataService.createOrUpdate({
        key: key,
        value: [...memories, memory],
      });
    }
    const text = "Saved Successfully";
    fileLogger.log({
      tool: "saveUserInfoToMemory",
      output: text,
    });
    return {
      content: [
        {
          type: "text",
          text: text,
        },
      ],
    };
  }
);
export const UrlContentTypeEnum = z.enum(
  ["pdf", "google_doc", "google_sheet", "web_page", "youtube_video", "image"],
  {
    description: html`if you for sure know that url has contents for one of
    these categories (depending on extension or url structure), (or user has
    mentioned that summarise this pdf, then you for sure know type is to be sent
    as pdf, irrespective of url structure), then pass it, otherwise leave it
    empty`,
  }
);
export type UrlContentType = z.infer<typeof UrlContentTypeEnum>;

mcpServer.tool(
  "getUrlContent",
  "Get the contents of the web-page that the url is pointing to.",
  {
    url: z.string({
      description: "the url for the which the contents needs to be fetched",
    }),
    type: UrlContentTypeEnum.optional(),
  },
  async (args) => {
    fileLogger.log({
      tool: "getUrlContent",
      args,
    });
    const { url, type } = args;
    const text = await getUrlContent(url, type);
    fileLogger.log({
      tool: "getUrlContent",
      output: text,
    });
    return {
      content: [
        {
          type: "text",
          text: text,
        },
      ],
    };
  }
);

mcpServer.prompt(
  "persona",
  { personaId: z.string(), userEmail: z.string() },
  async (args) => {
    fileLogger.log({
      prompt: "persona",
      args,
    });
    const { personaId, userEmail } = args;
    const result = await jsonDataService.findByKey<Persona>(
      `reactAIExperiments/users/${userEmail}/personas/${personaId}`
    );
    const persona = result?.value;
    if (!persona) {
      throw new Error("persona not found");
    }
    const personaInstruction = `
      user is interacting persona with following personality
      <persona>${JSON.stringify(persona)}</persona>
      you have to respond on persona's behalf

      additionally since, user interacting with this persona, getRelevantDocs tool becomes important
      so make sure to pass user query to that tool and fetch the relevant docs and respond accordingly
    `;
    fileLogger.log({
      prompt: "persona",
      output: personaInstruction,
    });
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: personaInstruction,
          },
        },
      ],
    };
  }
);

mcpServer.prompt("memory", { userEmail: z.string() }, async (args) => {
  fileLogger.log({
    prompt: "memory",
    args,
  });
  const { userEmail } = args;
  const key = `reactAIExperiments/users/${userEmail}/memories`;

  const jsonData = await jsonDataService.findByKey<Memory[]>(key);
  const memories = jsonData?.value;
  const statements = memories?.map((m) => m.statement);
  const memoryInstruction = html`
    Following memory statements are gathered from previous conversations with
    the user, try to incorporate them into the conversation context to provide a
    more personalized response.
    <statements> ${statements} </statements>

    additionally, if user has revealed something new about himself in the
    conversation so far, save that statement in the memory
  `;
  fileLogger.log({
    prompt: "memory",
    output: memoryInstruction,
  });
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: memoryInstruction,
        },
      },
    ],
  };
});

mcpServer.prompt("demo", {}, async (args) => {
  fileLogger.log({
    prompt: "demo",
    args,
  });
  const result = "demo prompt";
  fileLogger.log({
    prompt: "demo",
    output: result,
  });
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: result,
        },
      },
    ],
  };
});

(async () => {
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
})();

export default mcpServer;
