import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scryfallId: { type: String, required: true },
  imageUrl: { type: String, required: true },
});

const playerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Deck",
  },
  hand: [cardSchema],
  restOfTheDeck: [cardSchema],
});

const gameSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ["waiting", "inProgress", "finished"],
    default: "waiting",
  },
  players: [playerSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Game", gameSchema);
