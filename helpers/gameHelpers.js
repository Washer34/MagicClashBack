import mongoose from "mongoose";
const Deck = mongoose.model("Deck");
const Game = mongoose.model("Game");

export function shuffle(cards) {
  let currentIndex = cards.length,
    randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [cards[currentIndex], cards[randomIndex]] = [
      cards[randomIndex],
      cards[currentIndex],
    ];
  }

  return cards;
}

export async function distributeInitialCards(roomId) {
  const game = await Game.findById(roomId).populate({
    path: "players.deck",
    populate: {
      path: "cards",
      model: "Card",
    },
  });

  if (!game) {
    throw new Error("Jeu non trouvé");
  }

  for (let player of game.players) {
    if (!player.deck || !player.deck.cards) {
      throw new Error("Un joueur n'a pas de deck valide");
    }

    const shuffledCards = shuffle(player.deck.cards);

    player.hand = shuffledCards.slice(0, 7);
    player.restOfTheDeck = shuffledCards.slice(7);
  }

  await game.save();
  return game;
}

export async function deleteGame(gameId) {
  try {
    const result = await Game.findByIdAndDelete(gameId);
    if (result) {
      return { success: true, message: "Partie supprimée avec succès." };
    } else {
      return { success: false, message: "Partie non trouvée." };
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la partie:", error);
    return {
      success: false,
      message: "Erreur lors de la suppression de la partie.",
    };
  }
}

export async function createGame(data) {
  try {
    const newGame = new Game({
      creator: data.creator,
      name: data.name,
      status: 'waiting',
      players: [
        {
          user: data.creator,
          hand: [],
        },
      ],
    });

    const savedGame = await newGame.save();
    return savedGame;
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error);
    throw new Error("Erreur lors de la création de la partie");
  }
}

export async function joinGame(gameId, playerId) {
  try {
    let game = await Game.findById(gameId)

    const isPlayerInGame = game.players.some(
      (player) => player.user.toString() === playerId
    );
    if (isPlayerInGame) {
      throw new Error("Le joueur est déjà dans la partie");
    }

    game.players.push({
      user: playerId,
    });

    await game.save();

    game = await Game.findById(gameId).populate("players.user", "username");

    return game;
  } catch (error) {
    console.error("Erreur lors de la tentative de rejoindre la partie:", error);
    throw new Error("Erreur lors de la tentative de rejoindre la partie");
  }
}
