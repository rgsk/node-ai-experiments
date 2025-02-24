import { NextFunction, Request, Response } from "express";
import { getProps } from "lib/middlewareProps";
import { checkIsAdmin } from "./checkAdminOperation";
import { Middlewares } from "./middlewaresNamespace";

const adminRequired = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { decodedIdToken } = getProps<Middlewares.Authenticate>(
      req,
      Middlewares.Keys.Authenticate
    );
    const userEmail = decodedIdToken.email;
    if (!userEmail) {
      throw new Error("User email is missing or invalid");
    }
    if (checkIsAdmin(userEmail)) {
      return next();
    } else {
      throw new Error("User must be admin to perform this operation");
    }
  } catch (err) {
    return next(err);
  }
};

export default adminRequired;
