const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const { User } = require('../models');

/**
 * Middleware de vérification du token JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification requis'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Vérifier que l'utilisateur existe toujours et est actif
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé'
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

/**
 * Middleware optionnel - Ajoute l'utilisateur si token présent, sinon continue
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findByPk(decoded.userId);

      if (user && user.is_active) {
        req.user = {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        };
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, on continue sans utilisateur
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
