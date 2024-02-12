import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scryfallId: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: true },
});

export default mongoose.model("Card", cardSchema);
