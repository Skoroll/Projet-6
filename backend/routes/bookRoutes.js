// routes/bookRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const bookControler = require('../controllers/bookController');

router.get('/', auth, bookControler.getAllBooks);
router.post('/', auth, multer, bookControler.createBook);
router.get('/:id', auth, bookControler.getOneBook);
router.put('/:id', auth, multer, bookControler.modifyBook);
router.delete('/:id', auth, bookControler.deleteBook);

module.exports = router;
