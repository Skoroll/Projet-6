const bcrypt = require('bcrypt');
const User = require('../models/user');
const jwt = require('jsonwebtoken')

exports.signup = (req, res, next) => {
  //Chiffrage du mot de passe, valeur stockée dans .env
  bcrypt.hash(req.body.password, parseInt(process.env.NB_ROUND, 10))
    .then(hash => {
      const user = new User({
        email: req.body.email,
        password: hash
      });
      user.save()
        .then(() => res.status(201).json({ message: 'Utilisateur créé !' }))
        .catch(error => {
          res.status(400).json({ error: 'Erreur de création de l\'utilisateur' });
        });
    })
    .catch(error => {
      res.status(500).json({ error: 'Erreur du hachage du mot de passe' });
    });
};


exports.login = (req, res, next) => {
  //Recherche l'utilateur relatif à l'e-mail envoyé dans le body de la requête
  User.findOne({ email: req.body.email })
  .then(user => {
    //Si utilisateur non trouvé alors :
    if (!user) {
      return res.status(401).json({ message: 'Paire login/mot de passe incorrecte'});
    }
    bcrypt.compare(req.body.password, user.password)
              //Si un utilisateur correspondant est trouvé alors :
              .then(valid => {
                //Si le MdP est non conforme alors :
                  if (!valid) {
                      return res.status(401).json({ message: 'Paire login/mot de passe incorrecte' });
                  }
                  //Si la paire login/MdP est valide alors l'utilisateur se voit attribué son token d'identification
                  res.status(200).json({
                      userId: user._id,
                      token: jwt.sign(
                        { userId: user._id},
                        process.env.SECRET_KEY,
                        {expiresIn: '24h'}
                        
                      )
                  });
              })
              .catch(error => res.status(500).json({ error }));
      })
      .catch(error => res.status(500).json({ error }));
};
