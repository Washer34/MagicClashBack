import { Server } from "socket.io";
import Game from "./models/Game.js";
import {
  deleteGame,
  distributeInitialCards,
  shuffle,
  createGame,
  joinGame,
} from "./helpers/gameHelpers.js";

export default function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  let userSockets = {};

  io.on("connection", (socket) => {
    console.log(`Un utilisateur s'est connecté: ${socket.id}`);

    socket.on("register", (userId) => {
      userSockets[userId] = socket.id;
      console.log(
        `l'utilisateur ${userId} est connecté au socket: ${socket.id}`
      );

      socket.on("disconnect", () => {
        delete userSockets[userId];
      });
    });

    socket.on("createGame", async (data) => {
      try {
        const game = await createGame(data);
        socket.join(game._id.toString());
        socket.emit("gameCreatedForCreator", {
          gameId: game._id,
          message: "Partie créée et rejointe avec succès.",
        });
        io.emit("gameCreated", game);
      } catch (error) {
        socket.emit("erreur", {
          message: "Erreur lors de la création de la partie",
        });
      }
    });

    socket.on("selectDeck", async (data) => {
      const { deck, roomId, playerId } = data;
      try {
        let game = await Game.findById(roomId);

        if (!game) {
          socket.emit("erreur", { message: "la partie n'existe pas." });
          return;
        }
        const playerIndex = game.players.findIndex(
          (p) => p.user.toString() === playerId
        );
        if (playerIndex !== -1) {
          game.players[playerIndex].deck = deck;
          await game.save();

          const updatedGame = await Game.findById(roomId).populate(
            "players.user",
            "username"
          );
          io.to(roomId).emit("gameUpdated", updatedGame.toObject());
        } else {
          socket.emit("erreur", {
            message: "Joueur non trouvé dans la partie.",
          });
        }
      } catch (error) {
        socket.emit("erreur", {
          message: "Erreur lors de la tentative de selection du deck",
        });
      }
    });

    socket.on("joinGame", async (data) => {
      const { gameId, playerId } = data;
      try {
        const game = await joinGame(gameId, playerId);
        socket.join(gameId);

        const gameDetails = game.toObject();
        io.to(gameId).emit("gameUpdated", gameDetails);
      } catch (error) {
        socket.emit("erreur", {
          message: "Erreur lors de la tentative de rejoindre la partie",
        });
      }
    });

    socket.on("leaveGame", async ({ roomId, playerId }) => {
      try {
        let game = await Game.findById(roomId);

        if (!game) {
          socket.emit("erreur", { message: "La partie n'existe pas." });
          return;
        }

        if (game.creator.toString() === playerId) {
          await Game.deleteOne({ _id: roomId });
          io.to(roomId).emit("roomClosed", {
            message: "La partie a été fermée par le créateur.",
          });
          io.emit("gameDeleted", { roomId });
        } else {
          console.log("playerId", playerId);
          game.players = game.players.filter(
            (p) => p.user.toString() !== playerId
          );
          await game.save();

          game = await Game.findById(roomId).populate(
            "players.user",
            "username"
          );
          const gameDetails = game.toObject();

          io.to(roomId).emit("gameUpdated", gameDetails);
        }

        socket.leave(roomId);
      } catch (error) {
        console.error("Erreur lors de la gestion de leaveRoom:", error);
        socket.emit("erreur", {
          message: "Erreur lors du traitement de la demande de départ.",
        });
      }
    });

    socket.on("deleteGame", async ({ gameId }) => {
      try {
        await deleteGame(gameId);
        io.emit("gameDeleted", { gameId });
      } catch (error) {
        socket.emit("erreur", {
          message: "Erreur lors de la suppression de la partie",
        });
      }
    });

    socket.on("requestGameDetails", async ({ roomId }) => {
      try {
        const game = await Game.findById(roomId)
          .populate("players.user", "username")
          .exec();

        if (!game) {
          socket.emit("erreur", { message: "La partie n'existe pas." });
          return;
        }

        const gameDetails = game.toObject();

        socket.emit("gameDetails", gameDetails);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des détails de la partie:",
          error
        );
        socket.emit("erreur", {
          message: "Erreur lors de la récupération des détails de la partie.",
        });
      }
    });

    socket.on("startGame", async ({ roomId }) => {
      try {
        const game = await Game.findById(roomId).populate(
          "players.user players.deck"
        );

        if (!game) {
          socket.emit("erreur", { message: "La partie n'existe pas." });
          return;
        }

        for (const player of game.players) {
          if (!player.deck) {
            socket.emit("erreur", {
              message: "Tous les joueurs n'ont pas sélectionné de deck.",
            });
            return;
          }
        }
        await distributeInitialCards(roomId);

        const updatedGame = await Game.findById(roomId).populate(
          "players.user players.deck"
        );

        updatedGame.players.forEach(async (player) => {
          const userSocketId = userSockets[player.user._id.toString()];
          if (userSocketId) {
            const playerGameInfo = {
              hand: player.hand,
            };
            io.to(userSocketId).emit("handDealt", playerGameInfo);
          }
        });

        io.to(roomId).emit("gameStarted");
      } catch (error) {
        socket.emit("erreur", {
          message: "Erreur lors du lancement de la partie",
        });
      }
    });

    socket.on("drawCard", async ({ gameId, playerId }) => {
      const game = await Game.findById(gameId).populate("players.user");
      const player = game.players.find(
        (p) => p.user._id.toString() === playerId
      );

      if (player && player.restOfTheDeck.length > 0) {
        const card = player.restOfTheDeck.shift();
        player.hand.push(card);
        await game.save();

        io.to(player.user._id.toString()).emit("drawnCard", card);
      } else {
        io.to(player.user._id.toString()).emit("drawError", {
          message: "Aucune carte restante à piocher",
        });
      }
    });
  });

  return io;
}
