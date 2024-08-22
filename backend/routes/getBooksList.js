const express = require('express');
const router = express.Router();

const fakeBooks = [
  {
    title: "Les Misérables",
    author: "Victor Hugo",
    imageUrl: "https://example.com/image.jpg",
    genre: "Roman",
    year: 1862,
    _id: "someId", // Assurez-vous d'inclure un ID pour la clé
    userRationg: 5
  }
];

router.get('/', (req, res) => {
  res.json(fakeBooks);
});

module.exports = router;
