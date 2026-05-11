import { Router } from "express";
import { User } from "../models/User.js";
import type { AuthedRequest } from "../types.js";

export const usersRouter = Router();

usersRouter.get("/me", async (req, res) => {
  res.json({ user: (req as AuthedRequest).user });
});

usersRouter.get("/users", async (_req, res) => {
  const users = await User.find({
    externalId: { $ne: "demo-user" },
    name: { $nin: ["Demo User", "Team Member"] }
  })
    .sort({ status: 1, name: 1 })
    .limit(100)
    .lean();
  res.json({ users });
});
