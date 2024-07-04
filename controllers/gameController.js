import Game from "../Class/Game.js";
import User from "../models/User.js";
import { v4 as uuidv4 } from "uuid";
import { activeGames } from "../globalState.js";

export async function createGame(req, res) {
  try {
    const { gameName, userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const gameId = uuidv4();
    const newGame = new Game(gameId, user.username, req.io);
    newGame.name = gameName;
    newGame.addPlayer(user.username);
    activeGames[gameId] = newGame;

    res.status(201).json({ gameId, host: user.username, status: "waiting" });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création de la partie" });
  }
}

export async function joinGame(req, res) {
  try {
    const { gameId, userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const game = activeGames[gameId];
    if (game && game.state.status === "waiting") {
      game.addPlayer(user.username);
      res.status(200).json({ message: "Rejoint la partie avec succès" });
    } else {
      res.status(400).json({ error: "Partie non trouvée ou déjà commencée" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erreur lors de la communication avec la partie" });
  }
}
