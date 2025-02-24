export type ISODateString = string;
export type Message = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  status: "in_progress" | "incomplete" | "completed";
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
