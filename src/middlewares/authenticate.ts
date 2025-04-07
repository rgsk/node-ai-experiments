import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/authUtils.js";
import { addProps } from "../lib/middlewareProps.js";
import { Middlewares } from "./middlewaresNamespace.js";

const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const queryToken = req.query["token"];
    const authorizationHeader = req.header("Authorization");
    if (queryToken) {
      if (typeof queryToken !== "string") {
        throw new Error("query token must be string");
      }
    } else {
      if (!authorizationHeader) {
        throw new Error("Authorization Header not present");
      }
    }

    const idToken = queryToken || authorizationHeader?.split(" ")[1];
    if (idToken) {
      const { decodedIdToken } = await verifyToken(idToken);
      const userEmail = decodedIdToken.email;
      if (!userEmail) {
        throw new Error("userEmail not found");
      }
      const props: Middlewares.Authenticate = {
        decodedIdToken,
        userEmail,
      };
      addProps(req, props, Middlewares.Keys.Authenticate);
      return next();
    } else {
      throw new Error("token not present");
    }
  } catch (err: any) {
    return res.status(401).json({ message: err.message, err });
  }
};

export default authenticate;
