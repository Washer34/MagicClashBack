// socketio.js
import { Server } from "socket.io";
import { v4 as uuidv4 } from 'uuid';

import { activeGames, connectedUsers } from "./globalState.js";
import Game from "./Class/Game.js";
import User from './models/User.js';
import Deck from "./models/Deck.js";

function getActiveGamesList() {
  return Object.keys(activeGames).map((gameId) => ({
    gameId,
    name: activeGames[gameId].name,
    host: activeGames[gameId].hostUsername,
    status: activeGames[gameId].state.status,
    players: activeGames[gameId].players.map((player) => player.username),
  }));
}

export default function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Un utilisateur s'est connecté: ${socket.id}`);

    socket.on("get games list", () => {
      const gamesList = getActiveGamesList();
      socket.emit("games list", gamesList);
    })

    socket.on("create game", async (gameName, userId) => {
      try {
        const user = await User.findById(userId);
        if (!user) {
          socket.emit("error", "Utilisateur non trouvé");
          return;
        }

        const gameId = uuidv4();
        const newGame = new Game(gameId, user.username, io);
        newGame.name = gameName;
        newGame.addPlayer(user.username);
        activeGames[gameId] = newGame;

        socket.username = user.username;

        socket.join(gameId);

        socket.emit("game created", { gameId, host: user.username, status: "waiting" });
        const gamesList = getActiveGamesList();
        io.emit("games list", gamesList);
      } catch (error) {
        console.error('Erreur lors de la création de la partie: ', error);
        socket.emit("error", "Erreur lors de la création de la partie");
      }
    });

    socket.on("join game", async (gameId, userId) => {
      try {
        const user = await User.findById(userId);
        if (!user) {
          socket.emit("error", "Utilisateur non trouvé");
          return;
        }

        const game = activeGames[gameId];
        if (game && game.state.status === "waiting") {
          game.addPlayer(user.username);

          socket.username = user.username;
          socket.join(gameId);
          const gamesList = getActiveGamesList();
          io.emit("games list", gamesList);
        }
      } catch (error) {
        console.error('Erreur lors de la communication avec la partie: ', error);
        socket.emit("error", "Erreur lors de la communication avec la partie");
        
      }
    });

    socket.on("get game details", async (gameId) => {
      const game = activeGames[gameId];
      if (game) {
        socket.join(gameId);
        socket.emit("game details", {
          gameId: game.gameId,
          name: game.name,
          host: game.hostUsername,
          status: game.state.status,
          players: game.players.map((player) => ({
            username: player.username,
            isReady: player.isReady,
            deck: player.deck?.name,
          })),
        });
      } else {
        socket.emit("error", "Game not found");
      }
    });

    socket.on("get user decks", async (userId) => {
      try {
        const decks = await Deck.find({ user: userId });
        socket.emit("user decks", decks);
      } catch (error) {
        console.error("Erreur lors de la récupération des decks: ", error);
        socket.emit("error", "Erreur lors de la récupération des decks");
      }
    });

    socket.on("set deck", async ({ gameId, userId, deckId }) => {
      try {
        const game = activeGames[gameId];
        if (!game) {
          socket.emit("error", "Game not found");
          return;
        }

        const user = await User.findById(userId);
        const deck = await Deck.findById(deckId);

        if (!user || !deck) {
          socket.emit("error", "User or deck not found");
          return;
        }

        const player = game.players.find((p) => p.username === user.username);
        if (player) {
          player.setDeck(deck);
          game.updateGame();
        } else {
          socket.emit("error", "Player not found in game");
        }
      } catch (error) {
        console.error("Erreur lors de la sélection du deck: ", error);
        socket.emit("error", "Erreur lors de la sélection du deck");
      }
    });

    socket.on("toggle ready", async ({ gameId, userId }) => {
      try {
        const game = activeGames[gameId];
        if (!game) {
          socket.emit("error", "Game not found");
          return;
        }
        const user = await User.findById(userId);

        if (!user) {
          socket.emit("error", "User not found");
          return;
        }

        const player = game.players.find((p) => p.username === user.username);

        if (player) {
          player.toggleReady();
          game.updateGame();
        } else {
          socket.emit("error", "Player not found in game");
        }
      } catch (error) {
        console.error("Erreur lors du changement d'état de préparation: ", error);
        socket.emit("error", "Erreur lors du changement d'état de préparation");
      }
    })

    socket.on("start game", async (gameId) => {
      try {
        const game = activeGames[gameId];
        if (!game) {
          socket.emit("error", "Game not found");
          return;
        }

        if (game.allPlayersReady()) {
          game.startGame();
          io.to(gameId).emit("game started");
          const gamesList = getActiveGamesList();
          io.emit("games list", gamesList);
        } else {
          socket.emit(
            "error",
            "Not all players are ready or have selected a deck"
          );
        }
      } catch (error) {
        console.error("Erreur lors du démarrage de la partie: ", error);
        socket.emit("error", "Erreur lors du démarrage de la partie");
      }
    });

    socket.on("disconnect", () => {
      console.log(`Un utilisateur s'est déconnecté: ${socket.id}`);
    });
  });

  return io;
}
