import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { getProps } from "../lib/middlewareProps.js";
import { jsonDataService } from "../routers/children/jsonDataService.js";
import { Middlewares } from "./middlewaresNamespace.js";

export const checkIsAdmin = ({
  userEmail,
  key,
}: {
  userEmail: string;
  key: string;
}) => {
  if (key.startsWith("sdCentralAcademyWeb/")) {
    return ["rahulguptasde@gmail.com", "prinashagupta@gmail.com"].includes(
      userEmail
    );
  }
  return ["rahulguptasde@gmail.com"].includes(userEmail);
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
      const isAdmin = checkIsAdmin({ userEmail, key });
      if (isAdmin) {
        return next();
      }
      if (!key.includes("$userEmail")) {
        if (isAdmin) {
          return next();
        } else {
          throw new Error(
            "accessing key other than user specific key, user must be admin"
          );
        }
      }
      if (key.startsWith("sdCentralAcademyWeb/")) {
        await sdCentralAcademyWebChecks({ userEmail });
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

const sdCentralAcademyWebChecks = async ({
  userEmail,
}: {
  userEmail: string;
}) => {
  const result = await jsonDataService.findByKey<string[]>(
    `sdCentralAcademyWeb/admin/public/emailsWithDashboardAccess`
  );
  const emailsWithDashboardAccess = result?.value;
  if (!emailsWithDashboardAccess) {
    throw new Error("emailsWithDashboardAccess not present");
  }

  if (emailsWithDashboardAccess.includes(userEmail)) {
    return;
  }
  throw new Error("no access");
};
