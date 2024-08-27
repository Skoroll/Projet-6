const express = require('express');
const cors = require('cors'); // Gestion des CORS
const mongoose = require('mongoose');
const app = express();

// Import des routes
const bookRoutes = require('./routes/bookRoutes'); // Routes pour les livres
const userRoutes = require('./routes/userRoutes'); // Routes pour les utilisateurs

// Connexion à MongoDB
mongoose.connect('mongodb+srv://user:Test11@cluster0.jlzd4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
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

module.exports = app;
