import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

export type ISODateString = string;

export enum ToolVariant {
  serverSide = "serverSide",
  clientSide = "clientSide",
  serverSideRequiresPermission = "serverSideRequiresPermission",
  clientSideRequiresPermission = "clientSideRequiresPermission",
}
export enum ToolSource {
  mcp = "mcp",
  composio = "composio",
  web = "web",
}
export type ToolCall = {
  index: number;
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: any;
  };
  source: ToolSource;
  variant: ToolVariant;
};

export type Tool = {
  type: "function";
  variant: ToolVariant;
  source: ToolSource;
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        { type: "string"; description?: string; enum?: string[] }
      >;
      required: string[];
      additionalProperties: boolean;
    };
    strict: boolean;
  };
};

export type Message = ChatCompletionMessageParam & {
  id: string;
  status: "in_progress" | "incomplete" | "completed";
  tool_calls?: ToolCall[];
  type?: "image_url" | "image_ocr" | "file";
};
export type Role = Message["role"];
export type MessageFeedback = {
  id: string;
  type: "like" | "dislike";
  text?: string;
  createdAt: ISODateString;
};
export type Chat = {
  id: string | undefined;
  title: string;
  createdAt: ISODateString;
};
export type UserData = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  createdAt: ISODateString;
};
export type Memory = {
  id: string;
  statement: string;
  createdAt: ISODateString;
};
export type Conversation = {
  id: string | undefined;
  threadId: string;
  title: string;
  createdAt: ISODateString;
};

export type Persona = {
  id: string;
  name: string;
  collectionName: string;
  description: string;
  instructions: string;
};

interface BasePersonaKnowledgeItem {
  id: string;
  source: string;
  url: string;
  embedded: boolean;
}

export type PersonaKnowledgeItem = BasePersonaKnowledgeItem &
  (
    | {
        type: "website";
        metadata: {};
      }
    | {
        type: "file";
        metadata: {
          filename: string;
          filetype: string;
        };
      }
  );

export type CreditDetails = {
  id: string;
  userEmail: string;
  balance: number;
};
