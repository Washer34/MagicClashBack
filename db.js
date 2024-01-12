import mongoose from 'mongoose';


const DB_URI = process.env.DB_URI;

mongoose.connect(DB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));