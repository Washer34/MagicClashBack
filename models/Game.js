import mongoose from "mongoose";

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
  player1: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  player1Deck: { type: mongoose.Schema.Types.ObjectId, ref: "Deck" },
  player2Deck: { type: mongoose.Schema.Types.ObjectId, ref: "Deck" },

  player1Hand: [{
    name: String,
    scryfallId: String,
    imageUrl: String
  }],
  player2Hand: [{
    name: String,
    scryfallId: String,
    imageUrl: String
  }]
});

export default mongoose.model("Game", gameSchema);
