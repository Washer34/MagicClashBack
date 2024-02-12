import express from "express";
import authenticateToken from "../middleware/auth.js";
import Game from "../models/Game.js";

export default function (io) {
  const router = express.Router();

  router.patch("/:id/join", authenticateToken, async (req, res) => {
    try {
      const game = await Game.findById(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Partie non trouvée" });
      }

      if (!game.player1) {
        game.player1 = req.user._id;
      } else if (
        !game.player2 &&
        game.player1.toString() !== req.user._id.toString()
      ) {
        game.player2 = req.user._id;
      } else {
        return res.status(400).json({
          message:
            "La partie est déjà pleine ou vous êtes déjà dans la partie.",
        });
      }

      await game.save();
      const updatedGameDetails = await Game.findById(req.params.id)
        .populate("player1", "username")
        .populate("player2", "username");
      io.to(req.params.id).emit("playerJoined", updatedGameDetails);
      res.status(200).json(updatedGameDetails);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Erreur lors de la jointure de la partie" });
    }
  });

  router.patch("/:id/leave", authenticateToken, async (req, res) => {
    try {
      const game = await Game.findById(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Partie non trouvée" });
      }

      // Vérifier quel joueur quitte la partie et le retirer
      if (game.player1 && game.player1.toString() === req.user._id.toString()) {
        game.player1 = null;
      } else if (
        game.player2 &&
        game.player2.toString() === req.user._id.toString()
      ) {
        game.player2 = null;
      } else {
        return res
          .status(400)
          .json({ message: "Vous n'êtes pas dans cette partie." });
      }

      // Si aucun joueur n'est présent, supprimer la partie
      if (!game.player1 && !game.player2) {
        await Game.deleteOne({ _id: game._id });
        io.emit("gameDeleted", { gameId: game._id });
        return res.status(200).json({ message: "Partie supprimée" });
      }

      await game.save();
      const updatedGameDetails = await Game.findById(req.params.id)
        .populate("player1", "username")
        .populate("player2", "username");
      io.to(req.params.id).emit("playerLeft", updatedGameDetails);
      res.status(200).json(updatedGameDetails);
    } catch (error) {
      console.error(
        "Erreur lors de la tentative de sortie de la partie:",
        error
      );
      res.status(500).json({ error: "Erreur lors de la sortie de la partie" });
    }
  });

  router.get("/:id", authenticateToken, async (req, res) => {
    try {
      const game = await Game.findById(req.params.id)
        .populate("player1", "username") // Assurez-vous d'avoir un champ player1 dans votre modèle
        .populate("player2", "username"); // Assurez-vous d'avoir un champ player2 dans votre modèle
      if (!game) {
        return res.status(404).json({ error: "Room non trouvée" });
      }

      // Transformer le document mongoose en objet JS
      const gameObj = game.toObject();
      // Ajouter un champ isCreator pour déterminer si l'utilisateur actuel est le créateur
      gameObj.isCreator =
        req.user._id.toString() === gameObj.creator.toString();
      // Supprimer les champs inutiles ou sensibles avant de renvoyer la réponse
      delete gameObj.__v; // Exemple de suppression d'un champ inutile

      res.status(200).json(gameObj);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération de la room" });
    }
  });

  router.post("/", authenticateToken, async (req, res) => {
    try {
      const gameName = req.body.name || `a random party`;
      const newGame = new Game({
        name: gameName,
        player1: req.user._id,
        creator: req.user._id,
        status: "waiting",
      });
      console.log(newGame);

      await newGame.save();
      io.emit("gameCreated", newGame); // Utilisez directement 'io' ici
      res.status(201).json(newGame);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Erreur lors de la création de la partie" });
    }
  });

  router.get("/", authenticateToken, async (req, res) => {
    try {
      const games = await Game.find({}); // Modifiez cette ligne selon vos besoins, par exemple pour filtrer les parties
      res.status(200).json(games);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération des parties" });
    }
  });

  return router;
}
