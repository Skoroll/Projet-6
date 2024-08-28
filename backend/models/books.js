const mongoose = require('mongoose');

const ratingSchema = mongoose.Schema({
  userId: { type: String, required: true },
  grade: { type: Number, required: true }
});

const bookSchema = mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  imageUrl: { type: String },
  genre: { type: String, required: true },
  year: { type: Number, required: true },
  ratings: { type: [ratingSchema], default: [] },
  averageRating: { type: Number, default: 0 }
});

module.exports = mongoose.model('Book', bookSchema);
