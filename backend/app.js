// app.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const path = require('path');
const  dotEnv = require('dotenv').config()


// Import des routes
const bookRoutes = require('./routes/bookRoutes');
const userRoutes = require('./routes/userRoutes');

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_KEY)
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch((error) => console.error('Connexion à MongoDB échouée !', error));

// Middleware pour analyser le corps des requêtes en JSON
app.use(express.json());

// Utilisation de CORS
app.use(cors());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`Requête reçue : ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/books', bookRoutes); // Routes des livres
app.use('/api/auth', userRoutes); // Routes des utilisateurs

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Une erreur est survenue ' });
});

app.use('/images', express.static(path.join(__dirname, 'images')));

module.exports = app;
