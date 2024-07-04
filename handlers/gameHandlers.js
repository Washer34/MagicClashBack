import Game from "../Class/Game.js";
import { createGame, joinGame } from "../services/gameService.js";
import { getPlayerByUserId, getUserById } from "../utils/userUtils.js";

export function handleGameConnections(io, socket) {
  socket.on("get games list", () => {
    const gamesList = Game.getActiveGamesList();
    socket.emit("games list", gamesList);
  });

  socket.on("create game", async (gameName, userId) => {
    try {
      const user = await getUserById(userId);
      socket.username = user.username; // Associer le nom d'utilisateur au socket
      await createGame(gameName, user.id, socket, io);
    } catch (error) {
      console.error("Erreur lors de la création de la partie: ", error);
      socket.emit("error", "Erreur lors de la création de la partie");
    }
  });

  socket.on("join game", async (gameId, userId) => {
    try {
      await joinGame(gameId, userId, socket, io);
    } catch (error) {
      console.error("Erreur lors de la communication avec la partie: ", error);
      socket.emit("error", "Erreur lors de la communication avec la partie");
    }
  });

  socket.on("start game", async (gameId) => {
    try {
      const game = Game.getGameById(gameId);
      if (!game) {
        socket.emit("error", "Game not found");
        return;
      }

      const response = game.startGame();
      if (response.error) {
        socket.emit("error", response.error);
      } else {
        io.to(gameId).emit("game started", response);
        const gamesList = Game.getActiveGamesList();
        io.emit("games list", gamesList);
      }
    } catch (error) {
      console.error("Erreur lors du démarrage de la partie: ", error);
      socket.emit("error", "Erreur lors du démarrage de la partie");
    }
  });

  socket.on("toggle ready", async ({ gameId, userId }) => {
    try {
      const game = Game.getGameById(gameId);
      if (game) {
        const response = await game.toggleReady(userId);
        if (response.error) {
          socket.emit("error", response.error);
        } else {
          io.to(gameId).emit("game details", response);
        }
      } else {
        socket.emit("error", "Game not found");
      }
    } catch (error) {
      console.error("Erreur lors de la communication avec la partie: ", error);
      socket.emit("error", "Erreur lors de la communication avec la partie");
    }
  });

  socket.on("get game details", async (gameId) => {
    try {
      const game = Game.getGameById(gameId);
      if (game) {
        const details = game.getDetails();
        socket.emit("game details", details);
      } else {
        socket.emit("error", "Game not found");
      }
    } catch (error) {
      console.error("Erreur lors de la communication avec la partie: ", error);
      socket.emit("error", "Erreur lors de la communication avec la partie");
    }
  });

  socket.on("play card", ({ gameId, userId, card }) => {
    try {
      const game = Game.getGameById(gameId);
      if (!game) {
        socket.emit("error", "Game not found");
        return;
      }

      game.playCard(socket.username, card);
    } catch (error) {
      console.error("Erreur lors de la communication avec la partie: ", error);
      socket.emit("error", "Erreur lors de la communication avec la partie");
    }
  });

  socket.on("move card", ({ gameId, userId, cardId, position }) => {
    try {
      const game = Game.getGameById(gameId);
      if (game) {
        game.moveCard(socket.username, cardId, position);
      }
    } catch (error) {
      console.error("Erreur lors de la communication avec la partie: ", error);
      socket.emit("error", "Erreur lors de la communication avec la partie");
    }
  });

  socket.on("draw x cards", async ({ gameId, userId, number }) => {
    try {
      const player = await getPlayerByUserId(gameId, userId);
      const game = Game.getGameById(gameId);
      for (let i = 0; i < number; i++) {
        player.drawCard();
      }
      game.inGameUpdate();
    } catch (error) {
      console.error("Erreur lors de la pioche des cartes: ", error);
      socket.emit("error", "Erreur lors de la pioche des cartes");
    }
  });

  socket.on("look at library", async ({ gameId, userId, number }) => {
    try {
      const player = await getPlayerByUserId(gameId, userId);
      const game = Game.getGameById(gameId);

      const cards = game.lookAtLibrary(player, number);
      socket.emit("library cards", cards);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des cartes de la bibliothèque: ",
        error
      );
      socket.emit(
        "error",
        "Erreur lors de la récupération des cartes de la bibliothèque"
      );
    }
  });

  socket.on("move to graveyard", async ({ gameId, userId, cardId }) => {
    try {
      const player = await getPlayerByUserId(gameId, userId);
      const game = Game.getGameById(gameId);
      game.moveToGraveyard(player, cardId);
    } catch (error) {
      console.error(
        "Erreur lors du déplacement de la carte vers le cimetière: ",
        error
      );
      socket.emit(
        "error",
        "Erreur lors du déplacement de la carte vers le cimetière"
      );
    }
  });

  socket.on("move to exile", async ({ gameId, userId, cardId }) => {
    try {
      const player = await getPlayerByUserId(gameId, userId);
      const game = Game.getGameById(gameId);
      game.moveToExile(player, cardId);
    } catch (error) {
      console.error(
        "Erreur lors du déplacement de la carte vers l'exil: ",
        error
      );
      socket.emit(
        "error",
        "Erreur lors du déplacement de la carte vers l'exil"
      );
    }
  });

  socket.on("tap card", async ({ gameId, userId, cardId, tap }) => {
    try {
      const game = Game.getGameById(gameId);
      const player = await getPlayerByUserId(gameId, userId);

      if (game && player) {
        game.tapCard(player, cardId, tap);
      } else {
        socket.emit("error", "Game or player not found");
      }
    } catch (error) {
      console.error("Erreur lors de l'action de tap: ", error);
      socket.emit("error", "Erreur lors de l'action de tap");
    }
  });

  socket.on("change life", ({ gameId, username, change }) => {
    try {
      const game = Game.getGameById(gameId);
      if (!game) {
        socket.emit("error", "Game not found");
        return;
      }
      game.changePlayerLife(username, socket.username, change);
    } catch (error) {
      console.error("Error changing player life: ", error);
      socket.emit("error", "Error changing player life");
    }
  });
}
