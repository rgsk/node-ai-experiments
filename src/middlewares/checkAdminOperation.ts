import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getProps } from "../lib/middlewareProps.js";
import { Middlewares } from "./middlewaresNamespace.js";

export const checkIsAdmin = (userEmail: string) => {
  return userEmail === "rahulguptasde@gmail.com";
};

const checkAdminOperation =
  ({
    keySource,
    operationType,
    bulk,
  }: {
    keySource: "query" | "body";
    operationType: "read" | "write";
    bulk?: boolean;
  }) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userEmail } = getProps<Middlewares.Authenticate>(
        req,
        Middlewares.Keys.Authenticate
      );
      const isAdmin = checkIsAdmin(userEmail);
      if (isAdmin) {
        return next();
      }
      let key: string | undefined;
      if (bulk) {
        if (keySource === "body") {
          const keys: string[] = req.body.data.map((entry: any) => entry.key);
          // check if private key exists
          key = keys.find(
            (k) => k.includes("admin") && !k.includes("admin/public")
          );
          if (!key) {
            // find the public admin key
            key = keys.find((k) => k.includes("admin/public"));
          }
          if (!key) {
            key = keys[0];
          }
        }
      } else {
        if (keySource === "query") {
          key = z.string().parse(req.query.key);
        } else if (keySource === "body") {
          key = z.string().parse(req.body.key);
        }
      }
      if (!key) {
        throw new Error("key is not present");
      }
      if (!key.includes("admin")) {
        return next();
      }
      if (key.includes("admin/public")) {
        if (operationType === "read") {
          return next();
        } else {
          throw new Error("no write access to admin key");
        }
      } else {
        throw new Error("no read/write access to private admin key");
      }
    } catch (err) {
      return next(err);
    }
  };

export default checkAdminOperation;
