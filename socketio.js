import { Server } from "socket.io";
import Game from "./models/Game.js";
import User from "./models/User.js";

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

    socket.on("register", async (userId) => {
      try {
        const user = await User.findById(userId);
        if (!user) {
          console.log("Utilisateur non trouvé");
          return;
        }
        userSockets[userId] = { socketId: socket.id, username: user.username };
        console.log(
          `L'utilisateur ${user.username} (${userId}) est connecté au socket: ${socket.id}`
        );
      } catch (error) {
        console.error("Erreur lors de la recherche de l'utilisateur: ", error);
      }

      socket.on("disconnect", () => {
        const userId = Object.keys(userSockets).find(
          (key) => userSockets[key].socketId === socket.id
        );
        if (userId) {
          console.log(`Utilisateur déconnecté: ${userId}`);
          delete userSockets[userId];
        }
      });

      socket.on("requestGames", async () => {
        try {
          const games = await Game.find();
          socket.emit("updateGamesList", games);
        } catch (error) {
          console.error("Erreur lors de la récupération des parties:", error);
        }
      });

      socket.on("createGame", async ({ name, creator }) => {
        try {
          const newGame = new Game({
            name,
            creator,
            status: "waiting",
            players: [{ user: creator }],
          });
          await newGame.save();
          const games = await Game.find();
          io.emit("updateGamesList", games);

          const creatorSocketInfo = userSockets[creator];

          if (creatorSocketInfo && creatorSocketInfo.socketId) {
            socket.join(newGame._id.toString());
            io.to(creatorSocketInfo.socketId).emit("createdGame", {
              gameId: newGame._id,
            });
          } else {
            console.log("Socket ID du créateur non trouvé");
          }
        } catch (error) {
          console.error("Erreur lors de la création de la partie: ", error);
        }
      });

      socket.on("joinGame", async ({ roomId, userId }) => {
        try {
          const game = await Game.findById(roomId);
          if (!game) {
            console.log("Partie non trouvée.");
            return;
          }

          const isAlreadyPlayer = game.players.some((player) =>
            player.user.equals(userId)
          );
          if (!isAlreadyPlayer) {
            game.players.push({ user: userId });
            await game.save();

            socket.join(roomId.toString());
          }
            const updatedGame = await Game.findById(roomId)
              .populate("players.user", "-email -password -__v")
              .populate("creator", "username");
            
          const allPlayersReady =
            game.playersReady.length === game.players.length;

            io.to(roomId).emit("gameUpdated", {updatedGame: updatedGame, allPlayersReady: allPlayersReady});
        } catch (error) {
          console.error(
            "Erreur lors de la tentative de rejoindre la partie: ",
            error
          );
        }
      });

      socket.on("requestGameDetails", async ({ roomId }) => {
        console.log("il demande les détails: ", roomId);
        try {
          const game = await Game.findById(roomId);

          if (!game) {
            console.log("Partie non trouvée");
            return;
          }

          const updatedGame = await Game.findById(roomId)
            .populate("players.user", "-email -password -__v")
            .populate("creator", "username");
          
            socket.emit("gameDetails", {updatedGame});
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des informations de la partie: ",
            error
          );
          socket.emit("error", {
            message:
              "Erreur lors del a récupération des informations de la partie",
          });
        }
      });

      socket.on("playerReady", async ({ roomId, userId, isReady }) => {
        try {
          const game = await Game.findById(roomId);
          if (!game) {
            console.log("Partie non trouvée");
            return;
          }

          const index = game.playersReady.indexOf(userId);
          if (isReady && index === -1) {
            game.playersReady.push(userId);
          } else if (!isReady && index !== -1) {
            game.playersReady.splice(index, 1);
          }

          await game.save();

          const updatedGame = await Game.findById(roomId)
            .populate("players.user", "username")
            .populate("creator", "username");
          
          const allPlayersReady = game.playersReady.length === game.players.length;

          io.to(roomId).emit("gameUpdated", { updatedGame: updatedGame, allPlayersReady: allPlayersReady });
        } catch (error) {
          console.error(
            "Erreur lors de la mise à jour de l'état prêt du joueur: ",
            error
          );
        }
      });

      socket.on("selectDeck", async ({ roomId, playerId, deck }) => {
        const game = await Game.findById(roomId);
        const playerIndex = game.players.findIndex(
          (p) => p.user.toString() === playerId
        );

        if (playerIndex !== -1) {
          game.players[playerIndex].deck = deck;
          await game.save();

          const updatedGame = await Game.findById(roomId)
            .populate("players.user", "-email -password -__v")
            .populate("creator", "username");
          
          const allPlayersReady =
            game.playersReady.length === game.players.length;

          io.to(roomId).emit("gameUpdated", {
            updatedGame: updatedGame,
            allPlayersReady: allPlayersReady,
          });
        }
      });

      socket.on("startGame", async ({ roomId }) => {
        const game = await Game.findById(roomId);
        if (
          game &&
          game.status === "waiting" &&
          game.playersReady.length === game.players.length
        ) {
          game.status = "inProgress";
          await game.save();

          io.to(roomId).emit("gameStarted", { roomId });
        } else {
          console.log("peut pas démarrer");
        }
      });

      socket.on("leaveGame", async ({ roomId, playerId }) => {
        try {
          const game = await Game.findById(roomId);
          if (!game) {
            console.log("Partie non trouvée");
            return;
          }

          if (game.creator.toString() === playerId) {
            await Game.deleteOne({ _id: roomId });

            io.to(roomId).emit("gameDeleted", { message: "L'hôte a quitté la partie." });
            io.emit('gamesListUpdated');
            io.in(roomId).socketsLeave(roomId);

          } else {
            game.players = game.players.filter(player => player.user.toString() !== playerId);

            await game.save();

            const updatedGame = await Game.findById(roomId)
              .populate("players.user", "-email -password -__v")
              .populate("creator", "username");
            io.to(roomId).emit("gameUpdated", { updatedGame, allPlayersReady: updatedGame.playersReady.length === updatedGame.players.length });
          }
        } catch (error) {
          console.error("Erreur lors de l'action leaveGame", error);
        }

        socket.leave(roomId);

      })
    });
  });

  return io;
}
