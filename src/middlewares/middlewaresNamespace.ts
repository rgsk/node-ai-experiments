import { verifyToken } from "lib/authUtils";

export namespace Middlewares {
  export enum Keys {
    Authenticate = "Authenticate",
    ErrorData = "ErrorData",
  }
  export type Authenticate = {
    decodedIdToken: Awaited<ReturnType<typeof verifyToken>>["decodedIdToken"];
    userEmail: string;
  };
  export type ErrorData = {
    data?: any;
    status?: number;
  };
}
