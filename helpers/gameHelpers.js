import mongoose from "mongoose";
const Deck = mongoose.model("Deck");
import { v4 as uuidv4 } from "uuid";

export async function distributeCards(deckId) {
  const deck = await Deck.findById(deckId);
  if (!deck) throw new Error("Deck not found");

  const shuffledCards = deck.cards.sort(() => 0.5 - Math.random());
  const hand = shuffledCards.slice(0, 7).map(card => ({
    ...card._doc,
    id: uuidv4(),
  }));
  return hand;
}
