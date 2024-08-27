const Book = require('../models/books');

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBook = async (req, res) => {
  try {
    const bookObject = JSON.parse(req.body.book);

    // Retire les champs id et userId
    delete bookObject._id;
    delete bookObject._userId;

    // Crée l'URL de l'image
    const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/images/${req.file.filename}` : null;
    console.log(bookObject);

    let userGrade = "";
    for (i = 0; i < bookObject.ratings.length; i++) {

      actualUserId = bookObject.ratings[i].userId;

      if(actualUserId === req.userId){

        userGrade = bookObject.ratings[i].grade;
      }
    };
    // Crée un nouveau livre
    const book = new Book({
    /*  ...bookObject,
      userId: req.userId, // Ajout de l'userID
      //Défini l'URL de l'image*/

      title: bookObject.title,
      author: bookObject.author,
      imageUrl: imageUrl,
      year: parseInt(bookObject.year, 10),
      genre: bookObject.genre,
      grade: userGrade
    });

    // Ajoute le livre à la base de donnés
    const newBook = await book.save();
    console.log(newBook)
    res.status(201).json(newBook);
  } catch (error) {
    console.log(error.message)
    res.status(400).json({ message: error.message });
  }
};

exports.getOneBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (book) {
      res.json(book);
    } else {
      res.status(404).json({ message: 'Book not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.modifyBook = async (req, res) => {
  const bookObject = req.file ? {
    ...JSON.parse(req.body.book),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
} : { ...req.body };

delete bookObject._userId;
Book.findOne({_id: req.params.id})
    .then((book) => {
        if (book.userId != req.auth.userId) {
            res.status(401).json({ message : 'Not authorized'});
        } else {
            Book.updateOne({ _id: req.params.id}, { ...bookObject, _id: req.params.id})
            .then(() => res.status(200).json({message : 'Livre modifié!'}))
            .catch(error => res.status(401).json({ error }));
        }
    })
    .catch((error) => {
        res.status(400).json({ error });
    });
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => {
      if (book.userId != req.auth.userId) {
        return res.status(401).json({ message: 'Not authorized' });
      } else {
        const filename = book.imageUrl ? book.imageUrl.split('/images/')[1] : null;
        if (filename) {
          fs.unlink(`images/${filename}`, () => {
            Book.deleteOne({ _id: req.params.id })
              .then(() => res.status(200).json({ message: 'Livre supprimé !' }))
              .catch(error => res.status(401).json({ error }));
          });
        } else {
          Book.deleteOne({ _id: req.params.id })
            .then(() => res.status(200).json({ message: 'Livre supprimé !' }))
            .catch(error => res.status(401).json({ error }));
        }
      }
    })
    .catch(error => {
      res.status(500).json({ error });
    });
};
