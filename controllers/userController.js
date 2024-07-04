import Deck from "../models/Deck.js";

export async function getUserDecks(req, res) {
  try {
    const decks = await Deck.find({ user: req.params.userId });
    res.status(200).json(decks);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des decks" });
  }
}
