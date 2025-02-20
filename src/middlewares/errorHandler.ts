import { NextFunction, Request, Response } from "express";
import { getOptionalProps } from "lib/middlewareProps";
import { Middlewares } from "./middlewaresNamespace";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { data, status } =
    getOptionalProps<Middlewares.ErrorData>(req, Middlewares.Keys.ErrorData) ??
    {};
  console.log("Error Handler Middleware: ");
  console.log(err);
  console.log(err.message);
  console.log(data);
  return res
    .status(status ?? 500)
    .json({ message: err.message, data: data, err });
};

export default errorHandler;
