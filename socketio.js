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

  const roomsReadyState = {};

  io.on("connection", (socket) => {
    console.log("Un utilisateur s'est connecté");

    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId);
      console.log(`Utilisateur ${socket.id} a rejoint la salle ${roomId}`);
    });

    socket.on("leaveRoom", async ({ roomId, userId }) => {
      console.log('utilisateur quitte la partie')
      try {
        const game = await Game.findById(roomId);
        if (!game) {
          console.log("Partie non trouvée");
          return;
        }

        let isCreatorChanged = false;
        if (game.player1 && game.player1.toString() === userId) {
          game.player1 = null;
          if (game.player2) {
            game.player1 = game.player2;
            game.player2 = null;
            game.creator = game.player1;
            isCreatorChanged = true;
          }
        } else if (game.player2 && game.player2.toString() === userId) {
          game.player2 = null;
        }

        await game.save();

        io.to(roomId).emit("playerLeft", userId);

        if (isCreatorChanged && game.player1) {
          io.to(game.player1.toString()).emit("isCreator", true);
        }

        if (!game.player1) {
          await Game.deleteOne({ _id: roomId });
          io.emit("gameDeleted", { gameId: roomId });
        } else {
          const updatedRoomDetails = await Game.findById(roomId)
            .populate("player1", "username")
            .populate("player2", "username");
          io.to(roomId).emit("updateRoom", updatedRoomDetails);
        }
      } catch (error) {
        console.error(
          "Erreur lors de la tentative de sortie de la partie:",
          error
        );
      }
    });

    socket.on("gameReady", async ({ roomId }) => {
      console.log(`la room ${roomId} est prête`);
      io.to(roomId).emit("gameReadyResponse");
    });

    socket.on("playerReady", async ({ roomId, userId }) => {
      console.log("un joueur est prêt")
      console.log(roomId);
      console.log(userId);
      if (!roomsReadyState[roomId]) {
        roomsReadyState[roomId] = new Set();
      }
      roomsReadyState[roomId].add(userId);

      const game = await Game.findById(roomId);
      // Vérifier si tous les joueurs sont prêts
      if (
        game &&
        roomsReadyState[roomId].size === (game.player1 && game.player2 ? 2 : 1)
      ) {
        console.log("je démarre la game");
        // Tous les joueurs sont prêts, démarrez le jeu
        startGame(roomId, game, io);
      }
    });

    async function startGame(roomId, game, io) {
      try {
        // Distribuez les cartes pour chaque joueur
        const player1Hand = await distributeCards(game.player1Deck);
        const player2Hand = await distributeCards(game.player2Deck);

        // Émettez 'handsDistributed' pour chaque joueur avec leur main respective
        io.to(game.player1.toString()).emit("handsDistributed", {
          playerId: game.player1,
          hand: player1Hand,
        });
        console.log("main 1 envoyée à:", game.player1);
        io.to(game.player2.toString()).emit("handsDistributed", {
          playerId: game.player2,
          hand: player2Hand,
        });
        console.log("main 2 envoyée")
      } catch (error) {
        console.error("Erreur lors de la distribution des cartes:", error);
      }
    }

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
