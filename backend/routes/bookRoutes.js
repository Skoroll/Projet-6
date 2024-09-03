const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');

// Importation du controler 
const bookCTRL = require('../controllers/bookController');

// Récupér tous les livres
router.get('/', bookCTRL.getAllBooks);

// Crée un nouveau livre
router.post('/', auth, multer, bookCTRL.createBook);

// Livres les mieux notés
router.get('/bestrating', bookCTRL.getBestRatedBooks);

// Récupére un livre spécifique
router.get('/:id', bookCTRL.getOneBook);

// Modifier un livre
router.put('/:id', auth, multer, bookCTRL.modifyBook);

// Supprimer un livre
router.delete('/:id', auth, multer, bookCTRL.deleteBook);

// Noter les livres
router.post('/:id/rating', auth, bookCTRL.rateBook);

module.exports = router;
