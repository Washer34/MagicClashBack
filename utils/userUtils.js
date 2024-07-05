import User from "../models/User.js";
import Game from "../Class/Game.js";

export async function getUserById(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  } catch (error) {
    throw new Error("Error retrieving user");
  }
}

export async function getPlayerByUserId(gameId, userId) {
  try {
    const game = Game.getGameById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const user = await getUserById(userId);
    const player = game.players.find((p) => p.username === user.username);

    if (!player) {
      throw new Error("Player not found in game");
    }

    return player;
  } catch (error) {
    throw new Error("Error retrieving player");
  }
}

export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).match(/[a-z]/i)
    ? string.charAt(0).toUpperCase() + string.slice(1)
    : string;
};