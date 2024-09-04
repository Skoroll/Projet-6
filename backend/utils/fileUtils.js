const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Fonction pour compresser l'image
async function compressImage(inputPath, outputPath) {
  try {
    console.log(`Compressing image from ${inputPath} to ${outputPath}`);
    await sharp(inputPath)
      .resize(300) // Redimensionne si nécessaire
      .webp({ quality: 80 }) // Compression WebP
      .toFile(outputPath);
    console.log(`Image compressed successfully: ${outputPath}`);
  } catch (error) {
    console.error('Erreur lors de la compression de l\'image:', error.message);
  }
}

async function safeUnlink(filePath) {
  try {
    // Vérifiez d'abord si le fichier existe
    await fs.access(filePath);
    console.log(`Attempting to delete file: ${filePath}`);
    await fs.unlink(filePath);
    console.log(`File deleted successfully: ${filePath}`);
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error.message);
  }
}

// Fonction pour traiter l'image
async function processImage(inputPath, outputPath) {
  await compressImage(inputPath, outputPath);

  // Assurez-vous que le fichier d'entrée n'est pas utilisé par d'autres processus
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Supprime le fichier d'entrée
  await safeUnlink(inputPath);
}

// Exporter les fonctions pour les utiliser ailleurs
module.exports = {
  compressImage,
  safeUnlink,
  processImage
};
