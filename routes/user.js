import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

const secretKey = process.env.SECRET_KEY;

router.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        });
        const savedUser = await user.save();
        res.status(201).send({message:'Success', userId: savedUser._id });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
      const token = jwt.sign({ _id: user._id }, secretKey, { expiresIn: '24h'});
      res.send({message: 'connection OK', username: user.username, token: token});
    } else {
      res.status(400).send('Invalid Credentials');
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

export default router;
