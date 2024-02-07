import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['waiting', 'inProgress', 'finished'], default: 'waiting' },
  decks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Deck' }],
});

export default mongoose.model('Game', gameSchema);