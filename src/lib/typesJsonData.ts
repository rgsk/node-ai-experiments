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
  createdAt: ISODateString;
};
export type Memory = {
  id: string;
  statement: string;
  createdAt: ISODateString;
};

export type Persona = {
  id: string;
  name: string;
  collectionName: string;
  description: string;
  instructions: string;
};
export type Website = {
  source: string;
  url: string;
  embedded: boolean;
};
