import { Router } from "express";

import authenticateToken from "../middleware/auth.js";
import Deck from "../models/Deck.js";
import { compareSync } from "bcrypt";

const router = Router();

router.get("/cards", (req, res) => {
  res.send("Liste des cartes");
});

router.get("/decks/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const deckId = req.params.id;

    const deck = await Deck.findOne({ _id: deckId, user: userId });

    if (!deck) {
      return res.status(404).json({ error: "Deck non trouvé" });
    }

    res.status(200).json(deck);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du deck" });
  }
});

router.put("/decks/:id", authenticateToken, async (req, res) => {
  try {
    const deckId = req.params.id;
    const userId = req.user._id;
    const { name, cards } = req.body;

    const deck = await Deck.findOne({ _id: deckId, user: userId });
    if (!deck) {
      return res.status(404).json({ error: "Deck non trouvé" });
    }

    deck.name = name;
    deck.cards = cards;
    await deck.save();

    res.status(200).json(deck);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du deck" });
  }
});

router.post("/decks", authenticateToken, async (req, res) => {
  try {
    const { name, cards } = req.body;
    const userId = req.user._id;

    const deck = new Deck({
      name,
      user: userId,
      cards,
    });

    await deck.save();

    res.status(201).json(deck);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création du deck" });
  }
});

router.get("/decks", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const decks = await Deck.find({ user: userId });

    res.status(200).json(decks);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des decks" });
  }
});

export default router;
