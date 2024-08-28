const Book = require("../models/books");
const fs = require("fs").promises;

//---------- Récupère tous les livres de la base de données
exports.getAllBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//---------- Permet de créer un nouveau livre
exports.createBook = async (req, res) => {
  try {
    console.log("Request received:", req.body);
    console.log("Auth info:", req.auth);

    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Parse le livre envoyé dans le corps de la requête
    const bookObject = JSON.parse(req.body.book);

    // Ajoute l'userId actuel au livre
    bookObject.userId = req.auth.userId;

    // Crée l'URL de l'image si un fichier a été envoyé
    const imageUrl = req.file
      ? `${req.protocol}://${req.get("host")}/images/${req.file.filename}`
      : null;

    // Cherche la note donnée par l'utilisateur actuel dans le tableau des évaluations, s'il existe
    const userRating = Array.isArray(bookObject.ratings)
      ? bookObject.ratings.find((rating) => rating.userId === req.auth.userId)
      : null;

    // Si une note est trouvée pour cet utilisateur, assigne la note à 'userGrade'
    // Sinon, assigne 'null' à 'userGrade' car l'utilisateur n'a pas encore noté le livre
    const userGrade = userRating ? userRating.grade : null;

    // Crée un nouvel objet livre avec les données reçues
    const book = new Book({
      title: bookObject.title,
      author: bookObject.author,
      imageUrl: imageUrl,
      year: parseInt(bookObject.year, 10),
      genre: bookObject.genre,
      ratings: bookObject.ratings || [],
      averageRating: bookObject.averageRating || 0,
      userId: req.auth.userId,
    });

    // Sauvegarde le nouveau livre dans la base de données
    const newBook = await book.save();

    // Retourne une réponse avec le livre créé
    res.status(201).json(newBook);
  } catch (error) {
    console.error("Error during book creation:", error.message);
    res.status(400).json({ message: error.message });
  }
};

//---------- Récupère un livre spécifique
exports.getOneBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (book) {
      res.json(book);
    } else {
      res.status(404).json({ message: "Book not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//---------- Modifie un livre existant
exports.modifyBook = async (req, res) => {
  try {
    const bookObject = req.file
      ? {
          ...JSON.parse(req.body.book),
          imageUrl: `${req.protocol}://${req.get("host")}/images/${
            req.file.filename
          }`,
        }
      : { ...req.body };

    delete bookObject._userId;

    const book = await Book.findOne({ _id: req.params.id });
    if (book.userId != req.auth.userId) {
      return res.status(401).json({ message: "Not authorized" });
    } else {
      await Book.updateOne(
        { _id: req.params.id },
        { ...bookObject, _id: req.params.id }
      );
      res.status(200).json({ message: "Livre modifié!" });
    }
  } catch (error) {
    res.status(400).json({ error });
  }
};

//---------- Supprime un livre
exports.deleteBook = async (req, res) => {
  try {
    // Cherche le livre dans la base de données
    const book = await Book.findById(req.params.id);

    // Vérifie si le livre existe
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }

    // Vérifie les autorisations
    if (book.userId != req.auth.userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    // Supprime l'image associée si elle existe
    if (book.imageUrl) {
      const filename = book.imageUrl.split("/images/")[1];
      await fs.unlink(`images/${filename}`);
    }

    // Supprime le livre de la base de données
    await Book.deleteOne({ _id: req.params.id });

    // Retourne une réponse de succès
    res.status(200).json({ message: "Livre supprimé !" });
  } catch (error) {
    console.error("Error deleting book:", error.message);
    res
      .status(500)
      .json({
        message: "Erreur lors de la suppression du livre",
        error: error.message,
      });
  }
};

//---------- Récupère les 3 livres les mieux notés
exports.getBestRatedBooks = async (req, res) => {
  console.log("Request received for best rated books");

  try {
    // Cherche les livres triés par note moyenne décroissante
    const books = await Book.find()
      .sort({ averageRating: -1 }) // Tri par note décroissante
      .limit(3); // Limite le nombre de résultats à 3

    console.log("Books fetched:", books);

    if (!books.length) {
      console.log("No books found with ratings.");
      return res.status(404).json({ message: "No books found" });
    }

    res.status(200).json(books);
  } catch (error) {
    console.error("Error retrieving best rated books:", error.message);
    res.status(500).json({ message: 'Failed to retrieve best rated books', error: error.message });
  }
};

//---------- Définir une note pour un livre spécifique
exports.rateBook = async (req, res) => {
  try {
    const { userId, rating } = req.body;
    const bookId = req.params.id;

    // Vérifie que la note est comprise entre 0 et 5
    if (rating < 0 || rating > 5) {
      return res
        .status(400)
        .json({ message: "La note doit être comprise entre 0 et 5" });
    }

    // Cherche le livre dans la base de données
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }

    // Vérifie si l'utilisateur a déjà noté ce livre
    const existingRating = book.ratings.find(
      (rating) => rating.userId === userId
    );
    if (existingRating) {
      return res.status(400).json({ message: "Vous avez déjà noté ce livre" });
    }

    // Ajoute la nouvelle note au tableau des évaluations
    book.ratings.push({ userId, grade: rating });

    // Recalcule la note moyenne
    const totalRating = book.ratings.reduce(
      (sum, rating) => sum + rating.grade,
      0
    );
    book.averageRating = totalRating / book.ratings.length;

    // Sauvegarde les changements dans la base de données
    await book.save();

    // Retourne la réponse avec le livre mis à jour
    res.status(200).json(book);
  } catch (error) {
    console.error("Error rating book:", error.message);
    res
      .status(500)
      .json({
        message: "Erreur lors de la notation du livre",
        error: error.message,
      });
  }
};
