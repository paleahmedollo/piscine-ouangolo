const { permissions } = require('../config/auth');

/**
 * Middleware de contrôle d'accès basé sur les rôles (RBAC)
 * @param {string} module - Le module concerné (piscine, restaurant, hotel, events, caisse, dashboard, users, rapports)
 * @param {string} action - L'action à vérifier
 * @returns {Function} Middleware Express
 */
const checkPermission = (module, action) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const userRole = req.user.role;

      // Vérifier si le module existe dans les permissions
      if (!permissions[module]) {
        return res.status(403).json({
          success: false,
          message: 'Module non reconnu'
        });
      }

      // Vérifier si l'action existe pour ce module
      if (!permissions[module][action]) {
        return res.status(403).json({
          success: false,
          message: 'Action non reconnue'
        });
      }

      // Vérifier si le rôle de l'utilisateur a la permission
      const allowedRoles = permissions[module][action];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé pour votre rôle'
        });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur de vérification des permissions'
      });
    }
  };
};

/**
 * Middleware pour vérifier si l'utilisateur a l'un des rôles spécifiés
 * @param {string[]} roles - Liste des rôles autorisés
 * @returns {Function} Middleware Express
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Rôle non autorisé'
      });
    }

    next();
  };
};

/**
 * Middleware pour vérifier si l'utilisateur est admin ou gerant
 * Admin et gerant ont tous les droits de gestion
 */
const isGerant = (req, res, next) => {
  if (!req.user || !['gerant', 'admin', 'directeur'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé au gérant, admin ou directeur'
    });
  }
  next();
};

/**
 * Middleware pour vérifier les rôles de direction
 */
const isDirecteur = (req, res, next) => {
  if (!req.user || !['gerant', 'admin', 'directeur'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé au gérant, admin ou directeur'
    });
  }
  next();
};

/**
 * Middleware pour vérifier si l'utilisateur a accès en lecture seule (maire)
 */
const isReadOnly = (req, res, next) => {
  if (req.user && req.user.role === 'maire') {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return res.status(403).json({
        success: false,
        message: 'Accès en lecture seule'
      });
    }
  }
  next();
};

/**
 * Vérifie que l'utilisateur peut accéder à un module spécifique
 * ADMIN = super admin (acces complet a tout, y compris paie)
 * GERANT = gestion (acces complet sauf paie)
 * DIRECTEUR = lecture seule
 */
const canAccessModule = (module) => {
  return (req, res, next) => {
    const moduleAccess = {
      piscine: ['maitre_nageur', 'gerant', 'admin', 'responsable', 'directeur', 'maire'],
      restaurant: ['serveuse', 'serveur', 'cuisinier', 'caissier', 'gerant', 'admin', 'responsable', 'directeur', 'maire'],
      cuisine: ['cuisinier', 'gerant', 'admin', 'responsable', 'directeur'],
      hotel: ['receptionniste', 'gerant', 'admin', 'responsable', 'directeur', 'maire'],
      events: ['gestionnaire_events', 'gerant', 'admin', 'responsable', 'directeur', 'maire'],
      caisse: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'caissier', 'gerant', 'admin', 'directeur', 'maire'],
      dashboard: ['gerant', 'admin', 'responsable', 'directeur', 'maire'],
      users: ['gerant', 'admin'],
      employees: ['admin', 'directeur'],
      expenses: ['gerant', 'admin', 'directeur']
    };

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    const allowedRoles = moduleAccess[module] || [];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès au module ${module} non autorisé`
      });
    }

    next();
  };
};

module.exports = {
  checkPermission,
  hasRole,
  isGerant,
  isDirecteur,
  isReadOnly,
  canAccessModule
};
