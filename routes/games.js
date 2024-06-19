import express from "express";
import authenticateToken from "../middleware/auth.js";

export default function (io) {
  const router = express.Router();

  return router;
}
