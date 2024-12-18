import { Router } from "express";
import { db } from "lib/db";
import { z } from "zod";

const friendsRouter = Router();
friendsRouter.get("/", async (req, res, next) => {
  try {
    const friends = await db.friend.findMany();
    return res.json(friends);
  } catch (err) {
    return next(err);
  }
});

const postRequestBodyValidator = z.object({
  name: z.string(),
  email: z.string().email(),
});

friendsRouter.post("/", async (req, res, next) => {
  try {
    const { name, email } = postRequestBodyValidator.parse(req.body);
    const friend = await db.friend.create({
      data: { name, email },
    });
    return res.json(friend);
  } catch (err) {
    return next(err);
  }
});

export default friendsRouter;
