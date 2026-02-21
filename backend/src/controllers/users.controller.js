const { Op } = require('sequelize');
const { User } = require('../models');
const { logAction } = require('../middlewares/audit.middleware');
const { roles } = require('../config/auth');

/**
 * GET /api/users
 * Lister les utilisateurs
 */
const getUsers = async (req, res) => {
  try {
    const { role, is_active, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    // Si l'utilisateur connecté est un gérant (pas admin), ne pas afficher les comptes admin
    if (req.user.role === 'gerant') {
      whereClause.role = { [Op.ne]: 'admin' };
    }

    if (role) whereClause.role = role;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { full_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
};

/**
 * GET /api/users/:id
 * Détails d'un utilisateur
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};

/**
 * POST /api/users
 * Créer un utilisateur
 */
const createUser = async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    if (!Object.values(roles).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      });
    }

    // Empêcher le gérant de créer un compte admin
    if (req.user.role === 'gerant' && role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas créer un compte administrateur'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si le username existe déjà
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Ce nom d\'utilisateur existe déjà'
      });
    }

    const user = await User.create({
      username,
      password_hash: password, // Sera hashé par le hook beforeCreate
      full_name,
      role
    });

    await logAction(req, 'CREATE_USER', 'users', 'user', user.id, {
      username,
      full_name,
      role,
      created_by: req.user.username
    });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur'
    });
  }
};

/**
 * PUT /api/users/:id
 * Modifier un utilisateur
 */
const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher le gérant de modifier un compte admin
    if (req.user.role === 'gerant' && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas modifier un compte administrateur'
      });
    }

    const { full_name, role, is_active } = req.body;

    if (role && !Object.values(roles).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      });
    }

    // Empêcher le gérant de définir le rôle admin
    if (req.user.role === 'gerant' && role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas attribuer le rôle administrateur'
      });
    }

    // Sauvegarder les anciennes valeurs pour l'historique
    const oldValues = {
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    };

    const newValues = {
      full_name: full_name || user.full_name,
      role: role || user.role,
      is_active: is_active !== undefined ? is_active : user.is_active
    };

    await user.update(newValues);

    // Log détaillé avec les anciennes et nouvelles valeurs
    await logAction(req, 'UPDATE_USER', 'users', 'user', user.id, {
      target_username: user.username,
      changes: {
        old: oldValues,
        new: newValues
      }
    });

    res.json({
      success: true,
      message: 'Utilisateur mis à jour',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
};

/**
 * PUT /api/users/:id/password
 * Réinitialiser le mot de passe d'un utilisateur
 */
const resetPassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher le gérant de réinitialiser le mot de passe d'un admin
    if (req.user.role === 'gerant' && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas modifier le mot de passe d\'un administrateur'
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    user.password_hash = new_password;
    await user.save();

    // Log détaillé avec le nom de l'utilisateur cible
    await logAction(req, 'RESET_PASSWORD', 'users', 'user', user.id, {
      target_username: user.username,
      target_full_name: user.full_name
    });

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation'
    });
  }
};

/**
 * PUT /api/users/:id/toggle-active
 * Activer/désactiver un utilisateur
 */
const toggleActive = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher de se désactiver soi-même
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous désactiver vous-même'
      });
    }

    // Empêcher le gérant de désactiver un admin
    if (req.user.role === 'gerant' && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas modifier le statut d\'un administrateur'
      });
    }

    const oldStatus = user.is_active;
    user.is_active = !user.is_active;
    await user.save();

    // Log détaillé avec les anciennes et nouvelles valeurs
    await logAction(req, user.is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'users', 'user', user.id, {
      target_username: user.username,
      target_full_name: user.full_name,
      changes: {
        old_status: oldStatus,
        new_status: user.is_active
      }
    });

    res.json({
      success: true,
      message: `Utilisateur ${user.is_active ? 'activé' : 'désactivé'}`,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification'
    });
  }
};

/**
 * DELETE /api/users/:id
 * Suppression définitive — réservée à ahmedpiscine uniquement (vérifié dans la route)
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    const deletedInfo = { username: user.username, full_name: user.full_name, role: user.role };

    await logAction(req, 'DELETE_USER', 'users', 'user', user.id, deletedInfo);

    // Suppression définitive
    await user.destroy();

    res.json({
      success: true,
      message: `Compte "${deletedInfo.full_name}" supprimé définitivement`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression. Des données liées à ce compte existent peut-être.'
    });
  }
};

/**
 * GET /api/users/roles
 * Lister les rôles disponibles
 */
const getRoles = async (req, res) => {
  let rolesList = [
    { id: 'admin', name: 'Administrateur', description: 'Super admin - Accès complet à tout, y compris la paie' },
    { id: 'maitre_nageur', name: 'Maître-nageur', description: 'Gestion de la piscine' },
    { id: 'serveuse', name: 'Serveuse', description: 'Gestion du restaurant (femme)' },
    { id: 'serveur', name: 'Serveur', description: 'Gestion du restaurant (homme)' },
    { id: 'receptionniste', name: 'Réceptionniste', description: 'Gestion de l\'hôtel' },
    { id: 'gestionnaire_events', name: 'Gestionnaire événements', description: 'Gestion des événements' },
    { id: 'gerant', name: 'Gérant', description: 'Administration du système (sans la paie)' },
    { id: 'responsable', name: 'Responsable', description: 'Supervision et rapports' },
    { id: 'directeur', name: 'Directeur', description: 'Lecture seule sur tous les modules' },
    { id: 'maire', name: 'Maire', description: 'Consultation uniquement' }
  ];

  // Le gérant ne peut pas voir/attribuer le rôle admin
  if (req.user.role === 'gerant') {
    rolesList = rolesList.filter(r => r.id !== 'admin');
  }

  res.json({
    success: true,
    data: rolesList
  });
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetPassword,
  toggleActive,
  deleteUser,
  getRoles
};
