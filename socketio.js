// socketio.js
import { Server } from "socket.io";
import { distributeCards } from "./helpers/gameHelpers.js";
import Game from "./models/Game.js";

export default function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // ou l'URL de votre front-end
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Un utilisateur s'est connecté");

    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId);
      console.log(`Utilisateur ${socket.id} a rejoint la salle ${roomId}`);
    });

    socket.on("startGame", async ({ roomId }) => {
      // Informer tous les clients dans la room que le jeu a commencé
      io.to(roomId).emit("gameStarted");
    });

    socket.on("gameReady", async ({ roomId, userId }) => {
      const game = await Game.findById(roomId);
      if (game.creator.toString() !== userId.toString()) {
        return;
      }
      try {
        const player1Hand = await distributeCards(game.player1Deck);
        const player2Hand = await distributeCards(game.player2Deck);

        game.player1Hand = player1Hand;
        game.player2Hand = player2Hand;
        await game.save();

        io.to(roomId).emit("handsDistributed", { player1Hand, player2Hand });
      } catch (error) {
        console.error("erreur: ", error);
      }
      console.log(`Le jeu dans la salle ${roomId} commence`);
    });

    socket.on("deckSelected", async ({ roomId, deckId, userId }) => {
      try {
        const game = await Game.findById(roomId);

        if (game.player1.toString() === userId) {
          game.player1Deck = deckId;
        } else if (game.player2.toString() === userId) {
          game.player2Deck = deckId;
        }

        await game.save();

        io.to(roomId).emit("deckSelectionUpdated", {
          player1Deck: game.player1Deck,
          player2Deck: game.player2Deck,
        });
        console.log(
          `Deck ${deckId} sélectionné pour la salle ${roomId} par l'utilisateur ${userId}`
        );
      } catch (error) {
        console.error("Erreur lors de la sélection du deck", error);
        // Gérer l'erreur appropriément
      }
    });

    socket.on("disconnect", () => {
      console.log("Un utilisateur s'est déconnecté");
    });
  });

  return io;
}
