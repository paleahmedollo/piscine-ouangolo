require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'default_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Définition des rôles
  // Hiérarchie: admin (super admin) > gerant (gestion) > directeur (lecture seule) > autres roles
  roles: {
    ADMIN: 'admin',
    MAITRE_NAGEUR: 'maitre_nageur',
    SERVEUSE: 'serveuse',
    SERVEUR: 'serveur',
    RECEPTIONNISTE: 'receptionniste',
    GESTIONNAIRE_EVENTS: 'gestionnaire_events',
    GERANT: 'gerant',
    RESPONSABLE: 'responsable',
    DIRECTEUR: 'directeur',
    MAIRE: 'maire'
  },

  // Permissions par module et action
  // ADMIN = super admin (acces complet a tout, y compris paie)
  // GERANT = gestion complete de l'etablissement
  // DIRECTEUR = acces complet (supervision generale)
  permissions: {
    piscine: {
      vente_tickets: ['maitre_nageur', 'gerant', 'admin', 'directeur'],
      gestion_abonnements: ['maitre_nageur', 'gerant', 'admin', 'directeur'],
      gestion_prix: ['gerant', 'admin', 'directeur'],
      lecture: ['maitre_nageur', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
    },
    restaurant: {
      ventes: ['serveuse', 'serveur', 'gerant', 'admin', 'directeur'],
      gestion_menu: ['gerant', 'admin', 'directeur'],
      lecture: ['serveuse', 'serveur', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
    },
    hotel: {
      reservations: ['receptionniste', 'gerant', 'admin', 'directeur'],
      gestion_chambres: ['gerant', 'admin', 'directeur'],
      lecture: ['receptionniste', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
    },
    events: {
      gestion: ['gestionnaire_events', 'gerant', 'admin', 'directeur'],
      devis: ['gestionnaire_events', 'gerant', 'admin', 'directeur'],
      gestion_espaces: ['gerant', 'admin', 'directeur'],
      lecture: ['gestionnaire_events', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
    },
    caisse: {
      cloture_propre: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'admin', 'directeur'],
      validation: ['gerant', 'admin', 'directeur'],
      lecture: ['gerant', 'admin', 'responsable', 'directeur', 'maire']
    },
    dashboard: {
      complet: ['gerant', 'admin', 'directeur'],
      lecture_seule: ['responsable', 'maire']
    },
    users: {
      gestion: ['gerant', 'admin', 'directeur'],
      lecture: ['gerant', 'admin', 'directeur']
    },
    employees: {
      gestion: ['admin', 'directeur'],
      paiement: ['admin', 'directeur'],
      lecture: ['admin', 'directeur']
    },
    expenses: {
      gestion: ['gerant', 'admin', 'directeur'],
      lecture: ['gerant', 'admin', 'directeur']
    },
    rapports: {
      tous_rapports: ['admin', 'gerant', 'responsable', 'directeur', 'maire'],
      propres_transactions: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events']
    }
  }
};
