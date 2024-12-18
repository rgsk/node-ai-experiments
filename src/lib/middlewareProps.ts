const props = Symbol('props');

export const addProps = <T>(req: any, obj: T, key: string) => {
  if (req.body[props] === undefined) {
    req.body[props] = {};
  }
  if (req.body[props][key]) {
    // middleware can't be used twice in a request cycle
    throw new Error(
      `${key} middleware is already used in current request cycle, don't use it again`
    );
  }
  req.body[props][key] = obj;
};

export const getProps = <T>(req: any, key: string) => {
  if (req.body[props] === undefined) {
    req.body[props] = {};
  }
  return req.body[props][key] as T;
};

export const getOptionalProps = <T>(req: any, key: string) => {
  if (req.body[props] === undefined) {
    req.body[props] = {};
  }
  if (key in req.body[props]) {
    return req.body[props][key] as T;
  }
  return undefined;
};

/**
 *  use this function to list all the middlewares and properties attached by them
 */
export const getAllProps = (req: any) => {
  return req.body[props];
};
