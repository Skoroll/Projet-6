const Book = require("../models/books");
const fs = require("fs").promises;
const sharp = require("sharp");
const path = require("path");

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
        .resize(300) // Redimensionne si nécessaire
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


// Fonction pour ajouter un délai
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

//---------- Modifie un livre existant
exports.modifyBook = async (req, res) => {
  try {
    // Log des données de la requête pour débogage
    console.log("Requête reçue:", req.body);
    if (req.file) {
      console.log("Fichier reçu:", req.file);
    }

    // Récupère le livre à modifier en utilisant l'ID de la requête
    const book = await Book.findOne({ _id: req.params.id });

    // Vérifie que l'utilisateur authentifié est bien celui qui a créé le livre
    if (book.userId != req.auth.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    let bookObject;

    // Si un nouveau fichier (image) est inclus dans la requête
    if (req.file) {
      // Récupère le nom du fichier de l'image existante à partir de l'URL
      const oldFilename = path.basename(book.imageUrl);
      // Définit le chemin de sortie pour l'image compressée
      const outputPath = `images/compressed-${req.file.filename}.webp`;

      // Traite et compresse l'image reçue
      await sharp(req.file.path)
        .resize(300) // Redimensionne l'image
        .webp({ quality: 80 }) // Compression WebP
        .toFile(outputPath);

      // Crée un objet contenant les nouvelles données du livre, avec la nouvelle URL d'image
      bookObject = {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/${outputPath}`,
      };

      // Délai pour s'assurer que le fichier non compressé est complètement disponible pour suppression
      await delay(1000);

      try {
        // Supprime l'image originale non compressée
        await fs.unlink(req.file.path);
        console.log("Nouvelle image non compressée supprimée :", req.file.path);
      } catch (error) {
        console.error("Erreur lors de la suppression de l'image non compressée :", error);
      }

      // Délai supplémentaire avant de supprimer l'ancienne image
      await delay(1000);

      // Définit le chemin de l'ancienne image
      const oldFilePath = `images/${oldFilename}`;
      try {
        // Vérifie si le fichier existe avant d'essayer de le supprimer
        if (await fs.stat(oldFilePath)) {
          // Supprime l'ancienne image
          await fs.unlink(oldFilePath);
          console.log(`Ancienne image supprimée : ${oldFilePath}`);
        }
      } catch (error) {
        // Si le fichier n'existe pas, le logue comme tel
        if (error.code === "ENOENT") {
          console.log("L'ancienne image n'existe pas :", oldFilePath);
        } else {
          // Logue toute autre erreur lors de la suppression de l'ancienne image
          console.error("Erreur lors de la suppression de l'ancienne image :", error);
        }
      }
    } else {
      // Si aucune nouvelle image n'est fournie, utilise les données du livre telles quelles
      bookObject = { ...req.body };
    }

    // Supprime le champ _userId pour éviter toute modification non autorisée
    delete bookObject._userId;

    // Met à jour le livre avec les nouvelles données dans la base de données
    await Book.updateOne(
      { _id: req.params.id },
      { ...bookObject, _id: req.params.id }
    );

    // Répond avec un message de succès
    res.status(200).json({ message: "Livre modifié!" });
  } catch (error) {
    // Logue l'erreur en cas de problème et répond avec un message d'erreur
    console.error("Erreur survenue:", error);
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
    res.status(500).json({
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
    res
      .status(500)
      .json({
        message: "Failed to retrieve best rated books",
        error: error.message,
      });
  }
};

//---------- Définir une note pour un livre spécifique
exports.rateBook = async (req, res) => {
  try {
    const { userId, rating } = req.body;
    const bookId = req.params.id;

    // Cherche le livre dans la base de données
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }

    // Ajoute la nouvelle note au tableau des évaluations
    book.ratings.push({ userId, grade: rating });

    // Recalcule la note moyenne
    const totalRating = book.ratings.reduce(
      (sum, rating) => sum + rating.grade,
      0
    );
    // Arrondit la moyenne à 2 chiffres après la virgule
    book.averageRating =
      Math.round((totalRating / book.ratings.length) * 100) / 100;

    // Sauvegarde les changements dans la base de données
    await book.save();

    // Retourne la réponse avec le livre mis à jour
    res.status(200).json(book);
  } catch (error) {
    console.error("Error rating book:", error.message);
    res.status(500).json({
      message: "Erreur lors de la notation du livre",
      error: error.message,
    });
  }
};
