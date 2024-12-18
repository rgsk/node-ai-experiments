import { Router } from "express";
import environmentVars from "lib/environmentVars";
import friendsRouter from "./children/friendsRouter";

const rootRouter = Router();
rootRouter.use("/friends", friendsRouter);
rootRouter.get("/", async (req, res, next) => {
  res.json({
    message: `Server is running on http://localhost:${environmentVars.PORT}`,
  });
});
export default rootRouter;
