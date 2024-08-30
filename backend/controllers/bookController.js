const Book = require("../models/books");
const fs = require("fs").promises;
const sharp = require("sharp");

//---------- Récupère tous les livres de la base de données
exports.getAllBooks = async (req, res) => {
  try {
    //Défini la variable "books"  /!\ avec un "s" /!\  comme l'ensemble des livres défini sur la base de donnés
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

    // Parse les données du livre
    const bookObject = JSON.parse(req.body.book);
    console.log("BookObject:", bookObject);

    // Ajoute l'userId actuel
    bookObject.userId = req.auth.userId;

    // Crée l'URL de l'image après compression
    let imageUrl = null;
    if (req.file) {
      const outputPath = `images/compressed-${req.file.filename}.webp`;
      await sharp(req.file.path)
        .resize(100) // Redimensionne si nécessaire
        .webp({ quality: 80 }) // Compression WebP
        .toFile(outputPath);

      imageUrl = `${req.protocol}://${req.get("host")}/${outputPath}`;

      // Supprime l'image originale non compressée
      await fs.unlink(req.file.path);
    }

    // Crée un nouvel objet livre
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

    console.log("Book object to save:", book);

    // Sauvegarde le livre
    const newBook = await book.save();
    res.status(201).json(newBook);
  } catch (error) {
    console.error("Error during book creation:", error.message);
    res.status(400).json({ message: error.message });
  }
};

//---------- Récupère un livre spécifique
exports.getOneBook = async (req, res) => {
  try {
    //La variable "book" devient l'entité de Book correspondante à l'id demandée
    const book = await Book.findById(req.params.id);
    //Si l'id demandée correspondant à un élément dans la base de donnés alors => réponse avec l'id
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
    // Si un fichier (image) est inclus dans la requête, crée un objet bookObject
    // avec les nouvelles données du livre, y compris une nouvelle URL d'image
    const bookObject = req.file
      ? {
          // Récupère les données du livre en parsant le corps de la requête JSON
          ...JSON.parse(req.body.book),
          imageUrl: `${req.protocol}://${req.get("host")}/images/${
            req.file.filename
          }`,
        }
      : // Si aucune image n'est fournie, bookObject est simplement une copie de req.body
        { ...req.body };

    // Supprime le champ _userId de l'objet bookObject pour empêcher toute modification non autorisée
    delete bookObject._userId;

    // Récupère le livre à modifier dans la base de données en utilisant l'ID passé dans les paramètres de la requête
    const book = await Book.findOne({ _id: req.params.id });

    // Vérifie si l'utilisateur authentifié est bien celui qui a créé le livre
    if (book.userId != req.auth.userId) {
      // Si l'utilisateur n'est pas autorisé, renvoie une réponse avec le statut 401 (Non autorisé)
      return res.status(401).json({ message: "Not authorized" });
    } else {
      // Si l'utilisateur est autorisé, met à jour le livre avec les nouvelles données
      await Book.updateOne(
         // Filtre pour sélectionner le livre à modifier
        { _id: req.params.id },
        // Les nouvelles données du livre à mettre à jour
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
  try {
    // Cherche les livres triés par note moyenne décroissante
    const books = await Book.find()
      .sort({ averageRating: -1 }) // Tri par note décroissante
      .limit(3); // Limite le nombre de résultats à 3

    if (!books.length) {
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
    // Arrondit la moyenne à 2 chiffres après la virgule
    book.averageRating = Math.round((totalRating / book.ratings.length) * 100) / 100;

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

