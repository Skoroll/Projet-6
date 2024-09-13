const multer = require('multer');

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    // Retirer l'extension actuelle du nom d'origine
    const name = file.originalname.split(' ').join('_').split('.')[0]; 
    const extension = MIME_TYPES[file.mimetype];
    
    // Créer le nouveau nom avec la date et l'extension appropriée
    callback(null, name + '_' + Date.now() + '.' + extension);
  }
});

module.exports = multer({ storage: storage }).single('image');
