const Book = require("../models/books");
const fs = require("fs").promises;
const sharp = require("sharp");
const path = require("path");


//Délai avant de valider une opération
//me permet de m'assurer que les opérations en cours se terminent avant de passer à la suite
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

//---------- Créer un nouveau livre
exports.createBook = async (req, res) => {
  try {
    console.log("Requête reçue:", req.body);
    console.log("Informations d'authentification:", req.auth);

    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Parse le livre envoyé dans le corps de la requête
    const bookObject = JSON.parse(req.body.book);

    // Ajoute l'userId actuel au livre
    bookObject.userId = req.auth.userId;

    let imageUrl = null;
    if (req.file) {
      const originalFilePath = path.join(__dirname, "../images", req.file.filename);
      const compressedFileName = `compressed-${req.file.filename}.webp`;
      const compressedFilePath = path.join(__dirname, "../images", compressedFileName);

      console.log(`Début de la compression de l'image : ${originalFilePath}`);

      try {
        // Compression et conversion de l'image
        await sharp(originalFilePath)
          .resize(300) // Redimensionne l'image
          .webp({ quality: 80 }) // Compression WebP
          .toFile(compressedFilePath);
        
        console.log(`Compression terminée. Image sauvegardée : ${compressedFilePath}`);
      } catch (compressionError) {
        console.error(`Erreur lors de la compression de l'image : ${compressionError.message}`);
        throw compressionError; // Rejette l'erreur pour qu'elle soit attrapée par le bloc catch principal
      }

      // Crée l'URL de l'image compressée
      imageUrl = `${req.protocol}://${req.get("host")}/images/${compressedFileName}`;

      // Ajoute un délai avant la suppression
      console.log(`Tentative de suppression du fichier temporaire : ${originalFilePath}`);
      setTimeout(async () => {
        try {
          await fs.unlink(originalFilePath);
          console.log(`Fichier temporaire supprimé : ${originalFilePath}`);
        } catch (unlinkError) {
          console.error(`Erreur lors de la suppression du fichier temporaire : ${unlinkError.message}`);
          // On ne lance pas l'erreur ici pour permettre la création du livre
        }
      }, 1000); // Délai de 1 seconde avant la suppression
    }

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
    console.error("Erreur lors de la création du livre:", error.message);
    res.status(400).json({ message: error.message });
  }
};


//---------- Modifie un livre existant
exports.modifyBook = async (req, res) => {
  try {
    console.log("Requête reçue pour modification:", req.body);
    if (req.file) {
      console.log("Fichier reçu pour modification:", req.file);
    }

    // Récupère le livre à modifier en utilisant l'ID de la requête
    console.log("Recherche du livre à modifier avec ID:", req.params.id);
    const book = await Book.findOne({ _id: req.params.id });
    console.log("Livre trouvé pour modification:", book);

    // Vérifie que l'utilisateur authentifié est bien celui qui a créé le livre
    if (book.userId != req.auth.userId) {
      console.log("Utilisateur non autorisé à modifier le livre.");
      return res.status(401).json({ message: "Not authorized" });
    }

    let bookObject;

    // Si un nouveau fichier (image) est inclus dans la requête
    if (req.file) {
      console.log("Début de la compression de l'image:", req.file.path);
      const oldFilename = path.basename(book.imageUrl);
      const outputPath = `images/compressed-${req.file.filename}.webp`;

      // Traite et compresse l'image reçue
      await sharp(req.file.path)
        .resize(300) // Redimensionne l'image
        .webp({ quality: 80 }) // Compression WebP
        .toFile(outputPath);
      console.log("Compression terminée. Image sauvegardée:", outputPath);

      // Crée un objet contenant les nouvelles données du livre, avec la nouvelle URL d'image
      bookObject = {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/${outputPath}`,
      };
      console.log("Nouveau bookObject avec image compressée:", bookObject);

      // Délai pour s'assurer que le fichier non compressé est complètement disponible pour suppression
      await delay(1000);
      console.log("Tentative de suppression du fichier temporaire:", req.file.path);

      try {
        // Supprime l'image originale non compressée
        await fs.unlink(req.file.path);
        console.log("Fichier temporaire supprimé avec succès.");
      } catch (error) {
        console.error("Erreur lors de la suppression du fichier temporaire:", error.message);
      }

      // Délai supplémentaire avant de supprimer l'ancienne image
      await delay(1000);

      // Définit le chemin de l'ancienne image
      const oldFilePath = `images/${oldFilename}`;
      console.log("Tentative de suppression de l'ancienne image:", oldFilePath);

      try {
        // Vérifie si le fichier existe avant d'essayer de le supprimer
        await fs.stat(oldFilePath);
        await fs.unlink(oldFilePath);
        console.log("Ancienne image supprimée avec succès:", oldFilePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          console.log("L'ancienne image n'existe pas :", oldFilePath);
        } else {
          console.error("Erreur lors de la suppression de l'ancienne image :", error.message);
        }
      }
    } else {
      // Si aucune nouvelle image n'est fournie, utilise les données du livre telles quelles
      bookObject = { ...req.body };
      console.log("Aucune nouvelle image fournie. Utilisation des données du livre telles quelles.");
    }

    // Supprime le champ _userId pour éviter toute modification non autorisée
    delete bookObject._userId;

    // Met à jour le livre avec les nouvelles données dans la base de données
    console.log("Mise à jour du livre dans la base de données.");
    await Book.updateOne(
      { _id: req.params.id },
      { ...bookObject, _id: req.params.id }
    );

    // Répond avec un message de succès
    res.status(200).json({ message: "Livre modifié!" });
  } catch (error) {
    // Logue l'erreur en cas de problème et répond avec un message d'erreur
    console.error("Erreur lors de la modification du livre:", error.message);
    res.status(400).json({ error: error.message });
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