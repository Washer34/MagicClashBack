import express from 'express';
import authenticateToken from '../middleware/auth.js';
import Game from '../models/Game.js';

export default function(io) {
  const router = express.Router();

  router.patch('/:id/join', authenticateToken, async (req, res) => {
    try {
      const game = await Game.findById(req.params.id);
      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' });
      }
  
      if (!game.players.includes(req.user._id)) {
        game.players.push(req.user._id);
        await game.save();
      }
  
      res.status(200).json(game);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la jointure de la partie' });
    }
  });

  router.patch('/:id/leave', authenticateToken, async (req, res) => {
    try {
      const game = await Game.findById(req.params.id);
      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' });
      }
      // Retirer le joueur de la liste des joueurs
      game.players = game.players.filter(playerId => playerId.toString() !== req.user._id.toString());
      if (game.players.length === 0) {
        await Game.findByIdAndRemove(req.params.id); // Supprime la room si elle est vide
        console.log('done');
        res.status(200).json({ message: 'Room supprimée car elle est vide' });
      } else {
        await game.save(); // Sinon, enregistre simplement la mise à jour
        res.status(200).json(game);
      }
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la sortie de la partie' });
    }
  });
  

  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const game = await Game.findById(req.params.id)
        .populate('players', 'username');
      if (!game) {
        return res.status(404).json({ error: 'Room non trouvée' });
      }
      res.status(200).json(game);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération de la room' });
    }
  });

  router.post('/', authenticateToken, async (req, res) => {
    try {
      const newGame = new Game({ name: req.body.name, players: [req.user._id] });
      await newGame.save();
      io.emit('gameCreated', newGame); // Utilisez directement 'io' ici
      res.status(201).json(newGame);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la création de la partie' });
    }
  });

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const games = await Game.find({}); // Modifiez cette ligne selon vos besoins, par exemple pour filtrer les parties
      res.status(200).json(games);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des parties' });
    }
  });

  return router;
}