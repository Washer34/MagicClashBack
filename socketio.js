import { Server } from "socket.io";
import "dotenv/config";
import { handleUserConnections } from "./handlers/userHandlers.js";
import { handleGameConnections } from "./handlers/gameHandlers.js";

export default function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONT_END,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Un utilisateur s'est connecté: ${socket.id}`);

    handleUserConnections(io, socket);
    handleGameConnections(io, socket);

    socket.on("disconnect", () => {
      console.log(`Un utilisateur s'est déconnecté: ${socket.id}`);
    });
  });

  return io;
}
