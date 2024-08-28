const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const bookController = require('../controllers/bookController');

// Route pour récupérer tous les livres
router.get('/', bookController.getAllBooks);

// Route pour créer un nouveau livre
router.post('/', auth, multer, bookController.createBook);

// Route pour récupérer un livre spécifique
router.get('/:id', bookController.getOneBook);

// Route pour modifier un livre
router.put('/:id', auth, multer, bookController.modifyBook);

// Route pour supprimer un livre
router.delete('/:id', auth, multer, bookController.deleteBook);

// Route pour récupérer les livres les mieux notés
router.get('/bestrating', bookController.getBestRatedBooks);

//Route pour permettre de noter les livres
router.post('/:id/rating', auth, bookController.rateBook);

module.exports = router;
