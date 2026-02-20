const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const { logAction } = require('../middlewares/audit.middleware');

/**
 * POST /api/auth/login
 * Authentification utilisateur
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom d\'utilisateur et mot de passe requis'
      });
    }

    // Rechercher l'utilisateur
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Vérifier si le compte est actif
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé'
      });
    }

    // Vérifier le mot de passe
    const isValid = await user.validatePassword(password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // Log de connexion
    await logAction(
      { user: { id: user.id }, ip: req.ip, headers: req.headers },
      'LOGIN',
      'auth',
      'user',
      user.id,
      { username: user.username }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
};

/**
 * POST /api/auth/logout
 * Déconnexion utilisateur (invalidation côté client)
 */
const logout = async (req, res) => {
  try {
    // Log de déconnexion
    await logAction(req, 'LOGOUT', 'auth', 'user', req.user.id);

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
};

/**
 * GET /api/auth/me
 * Récupérer le profil de l'utilisateur connecté
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

/**
 * PUT /api/auth/password
 * Changer le mot de passe
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    const user = await User.findByPk(req.user.id);

    // Vérifier le mot de passe actuel
    const isValid = await user.validatePassword(currentPassword);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    user.password_hash = newPassword;
    await user.save();

    // Log du changement de mot de passe
    await logAction(req, 'PASSWORD_CHANGE', 'auth', 'user', req.user.id);

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};

/**
 * POST /api/auth/refresh
 * Rafraîchir le token JWT
 */
const refreshToken = async (req, res) => {
  try {
    // Le middleware auth a déjà vérifié le token
    const user = await User.findByPk(req.user.id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non autorisé'
      });
    }

    // Générer un nouveau token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rafraîchissement du token'
    });
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  changePassword,
  refreshToken
};
