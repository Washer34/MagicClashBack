import User from "../models/User.js";
import Deck from "../models/Deck.js";
import Game from "../Class/Game.js";

export async function getUserDecks(userId) {
  return await Deck.find({ user: userId });
}

export async function setDeck(gameId, userId, deckId, io) {
  const game = Game.getGameById(gameId);
  if (!game) {
    throw new Error("Game not found");
  }

  const user = await User.findById(userId);
  const deck = await Deck.findById(deckId);

  if (!user || !deck) {
    throw new Error("User or deck not found");
  }

  const player = game.players.find((p) => p.username === user.username);
  if (player) {
    player.setDeck(deck);

    const gameDetails = await game.getDetails();
    io.to(gameId).emit("game details", gameDetails);
  } else {
    throw new Error("Player not found in game");
  }
}
