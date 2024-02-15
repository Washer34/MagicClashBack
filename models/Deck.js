import mongoose from "mongoose";

const deckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cards: [
    {
      name: { type: String, required: true },
      scryfallId: { type: String, required: true },
      imageUrl: { type: String, required: true },
    },
  ],
});

export default mongoose.model("Deck", deckSchema);
