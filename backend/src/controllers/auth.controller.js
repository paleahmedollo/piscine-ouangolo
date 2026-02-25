const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const { logAction } = require('../middlewares/audit.middleware');

/**
 * GET /api/auth/companies
 * Liste des entreprises actives (endpoint public pour l'écran de login)
 */
const getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'code', 'logo_url'],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des entreprises'
    });
  }
};

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

    // Rechercher l'utilisateur uniquement par username
    // L'entreprise est déjà encodée dans le username (suffixe _po, _xyz, etc.)
    // et stockée dans company_id du compte — transparent pour l'utilisateur
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

    // Générer le token JWT avec company_id
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        company_id: user.company_id || null
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // Récupérer les infos de l'entreprise si applicable
    let company = null;
    if (user.company_id) {
      company = await Company.findByPk(user.company_id, {
        attributes: ['id', 'name', 'code', 'logo_url', 'plan']
      });
    }

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
          role: user.role,
          company_id: user.company_id || null,
          company: company ? company.toJSON() : null
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
 */
const logout = async (req, res) => {
  try {
    await logAction(req, 'LOGOUT', 'auth', 'user', req.user.id);
    res.json({ success: true, message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
  }
};

/**
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ association: 'company', attributes: ['id', 'name', 'code', 'logo_url'] }]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, data: user.toJSON() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération du profil' });
  }
};

/**
 * PUT /api/auth/password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel et nouveau requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findByPk(req.user.id);
    const isValid = await user.validatePassword(currentPassword);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    user.password_hash = newPassword;
    await user.save();

    await logAction(req, 'PASSWORD_CHANGE', 'auth', 'user', req.user.id);

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de mot de passe' });
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Utilisateur non autorisé' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        company_id: user.company_id || null
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.json({ success: true, data: { token } });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du rafraîchissement du token' });
  }
};

module.exports = {
  getCompanies,
  login,
  logout,
  getProfile,
  changePassword,
  refreshToken
};
