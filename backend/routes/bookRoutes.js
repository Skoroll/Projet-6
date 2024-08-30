const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const bookController = require('../controllers/bookController');

// Récupér tous les livres
router.get('/', bookController.getAllBooks);

// Crée un nouveau livre
router.post('/', auth, multer, bookController.createBook);

// Livres les mieux notés
router.get('/bestrating', bookController.getBestRatedBooks);

// Récupére un livre spécifique
router.get('/:id', bookController.getOneBook);

// Modifier un livre
router.put('/:id', auth, multer, bookController.modifyBook);

// Supprimer un livre
router.delete('/:id', auth, multer, bookController.deleteBook);

// Noter les livres
router.post('/:id/rating', auth, bookController.rateBook);

module.exports = router;
