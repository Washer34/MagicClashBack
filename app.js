import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

import cardsRoutes from './routes/cards.js';
import userRoutes from './routes/user.js';
import gameRoutes from './routes/games.js';

import './db.js';

async function startApp() {
  const app = express();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // ou l'URL de votre front-end
      methods: ["GET", "POST"]
    }
  });
  
  io.on('connection', (socket) => {
    console.log("Un utilisateur s'est connecté");

    socket.on('disconnect', () => {
      console.log("Un utilisateur s'est déconnecté");
    });

    // Vous pouvez ajouter plus d'événements ici
  });

  app.use(cors());

  app.use(express.json());

  app.use('/api/users', userRoutes);
  app.use('/api/games', gameRoutes(io));
  app.use('/api', cardsRoutes);

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startApp();
