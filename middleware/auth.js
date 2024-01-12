import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
  const secretKey = process.env.SECRET_KEY;

  const token = req.header('Authorization');

  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }

  const tokenWithoutBearer = token.slice(7);

  jwt.verify(tokenWithoutBearer, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token non valide' });
    }
    req.user = user;
    next();
  });
};

export default authenticateToken;
