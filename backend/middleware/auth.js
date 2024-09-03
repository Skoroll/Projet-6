const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('Token manquant');
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('Token manquant');
    return res.status(401).json({ message: 'Token manquant' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY); // Le même secret utilisé pour générer le token
    req.auth = { userId: decodedToken.userId }; // Ajouté ici
    console.log('Token valide', decodedToken);
    next(); // Poursuit la requête si le token est valide
  } catch (error) {
    console.log('Token invalide');
    return res.status(401).json({ message: 'Token invalide' });
  }
};
