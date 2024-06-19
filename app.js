import "dotenv/config";

import cors from "cors";
import express from "express";
import http from "http";

import cardsRoutes from "./routes/cards.js";
import userRoutes from "./routes/user.js";
import gameRoutes from "./routes/games.js";

import initializeSocketIO from "./socketio.js";

import "./db.js";

async function startApp() {
  const app = express();
  const server = http.createServer(app);

  const io = initializeSocketIO(server);

  app.use(cors());
  app.use(express.json());

  app.use("/api/users", userRoutes);
  app.use("/api/games", gameRoutes(io));
  app.use("/api", cardsRoutes);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startApp();
