import { getUserDecks, setDeck } from "../services/userService.js";

export function handleUserConnections(io, socket) {
  socket.on("get user decks", async (userId) => {
    try {
      const decks = await getUserDecks(userId);
      socket.emit("user decks", decks);
    } catch (error) {
      console.error("Erreur lors de la récupération des decks: ", error);
      socket.emit("error", "Erreur lors de la récupération des decks");
    }
  });

  socket.on("set deck", async ({ gameId, userId, deckId }) => {
    try {
      await setDeck(gameId, userId, deckId, io);
    } catch (error) {
      console.error("Erreur lors de la sélection du deck: ", error);
      socket.emit("error", "Erreur lors de la sélection du deck");
    }
  });

}
