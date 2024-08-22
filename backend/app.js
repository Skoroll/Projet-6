const express = require('express');
const app = express();
const mongoose = require('mongoose');
const booksRoutes = require('./routes/getBooks'); // Assurez-vous que le chemin est correct
const userROutes = require('/routes/user');

mongoose.connect('mongodb+srv://user:Test11@cluster0.jlzd4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch((error) => console.error('Connexion à MongoDB échouée !', error));

// Middleware pour gérer les CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

app.use((req, res, next) => {
  console.log(`Requête reçue : ${req.method} ${req.url}`);
  next();
});

// Middleware pour analyser le corps des requêtes en JSON
app.use(express.json());

// Routes
app.use('/api/books', booksRoutes);
app.use('/api.auth', userROutes)
module.exports = app;
