import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import cardsRoutes from './routes/cards.js';
import userRoutes from './routes/user.js';

import './db.js';

async function startApp() {
  const app = express();

  app.use(cors());

  app.use(express.json());

  app.use('/api/users', userRoutes);
  app.use('/api', cardsRoutes);

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startApp();
