import { verifyToken } from "lib/authUtils";

export namespace Middlewares {
  export enum Keys {
    Authenticate = "Authenticate",
    ErrorData = "ErrorData",
    AttachUserEmail = "AttachUserEmail",
  }
  export type Authenticate = {
    decodedIdToken: Awaited<ReturnType<typeof verifyToken>>["decodedIdToken"];
  };
  export type AttachUserEmail = {
    userEmail: string;
  };
  export type ErrorData = {
    data: any;
  };
}
