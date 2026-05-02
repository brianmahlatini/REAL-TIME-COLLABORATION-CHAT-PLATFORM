import type { ErrorRequestHandler } from "express";
import { logger } from "../config/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  logger.error({ error }, "request failed");
  res.status(error.status ?? 500).json({
    message: error.message ?? "Internal server error"
  });
};
