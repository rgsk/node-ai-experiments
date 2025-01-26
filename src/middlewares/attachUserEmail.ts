import { NextFunction, Request, Response } from "express";
import { addProps, getProps } from "lib/middlewareProps";
import { Middlewares } from "./middlewaresNamespace";

const attachUserEmail = async (
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
    if (userEmail) {
      const props: Middlewares.AttachUserEmail = {
        userEmail,
      };
      addProps(req, props, Middlewares.Keys.AttachUserEmail);
      return next();
    } else {
      throw new Error("User email is missing or invalid");
    }
  } catch (err) {
    return next(err);
  }
};

export default attachUserEmail;
