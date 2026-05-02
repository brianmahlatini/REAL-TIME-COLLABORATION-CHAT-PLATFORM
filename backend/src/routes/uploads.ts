import { Router } from "express";
import multer from "multer";
import { uploadRateLimit } from "../middleware/rateLimit.js";
import { storeUpload } from "../services/uploads.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1
  }
});

export const uploadsRouter = Router();

uploadsRouter.post("/uploads", uploadRateLimit, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "File is required" });
    return;
  }

  const file = await storeUpload(req.file);
  res.status(201).json({ file });
});
