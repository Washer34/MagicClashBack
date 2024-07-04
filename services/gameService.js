import Game from "../Class/Game.js";
import { activeGames } from "../globalState.js";
import { v4 as uuidv4 } from "uuid";
import { getUserById } from "../utils/userUtils.js";

export async function createGame(gameName, userId, socket, io) {
  try {
    const user = await getUserById(userId);
    const gameId = uuidv4();
    const newGame = new Game(gameId, user.username, io);
    newGame.name = gameName;
    const response = await newGame.addPlayerAndGetDetails(userId);

    if (response.error) {
      socket.emit("error", response.error);
      return;
    }

    activeGames[gameId] = newGame;

    socket.username = user.username;
    socket.join(gameId);

    socket.emit("game created", {
      gameId,
      host: user.username,
      status: "waiting",
    });

    const gamesList = Game.getActiveGamesList();
    io.emit("games list", gamesList);
  } catch (error) {
    console.error("Erreur lors de la création de la partie: ", error);
    socket.emit("error", "Erreur lors de la création de la partie");
  }
}

export async function joinGame(gameId, userId, socket, io) {
  try {
    const user = await getUserById(userId);
    const game = Game.getGameById(gameId);
    if (game && game.state.status === "waiting") {
      const response = await game.addPlayerAndGetDetails(userId);

      if (response.error) {
        socket.emit("error", response.error);
        return;
      }

      socket.username = user.username;
      socket.join(gameId);
      io.to(gameId).emit("game details", response);

      const gamesList = Game.getActiveGamesList();
      io.emit("games list", gamesList);
    } else {
      socket.emit("error", "Partie non trouvée ou déjà commencée");
    }
  } catch (error) {
    console.error("Erreur lors de la communication avec la partie: ", error);
    socket.emit("error", "Erreur lors de la communication avec la partie");
  }
}
