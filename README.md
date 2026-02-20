# Système de Gestion - Complexe de Loisirs Ouangolo

Système intégré de gestion couvrant 4 modules : Piscine, Restaurant, Hôtel, Événements.

## Stack Technique

- **Backend** : Node.js + Express.js + Sequelize ORM + MySQL
- **Frontend** : React.js + TypeScript + Material-UI + Vite
- **Authentification** : JWT + RBAC (Role-Based Access Control)
- **Mode Hors Ligne** : IndexedDB + Synchronisation automatique

## Prérequis

- Node.js v18+
- MySQL 8.0+
- npm ou yarn

## Installation

### 1. Base de Données MySQL

```bash
# Créer la base de données
mysql -u root -p < database/schema.sql
```

Ou manuellement :
```sql
CREATE DATABASE ouangolo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Configurer l'environnement
# Éditer le fichier .env avec vos paramètres MySQL
cp .env.example .env

# Synchroniser la base de données et créer les données initiales
npm run db:sync

# Démarrer le serveur
npm run dev
```

Le serveur API démarre sur `http://localhost:3001`

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application démarre sur `http://localhost:5173`

## Configuration

### Variables d'environnement Backend (.env)

```env
PORT=3001
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ouangolo_db
DB_USER=root
DB_PASSWORD=votre_mot_de_passe

# JWT
JWT_SECRET=votre_secret_jwt_secure
JWT_EXPIRES_IN=24h

# CORS
FRONTEND_URL=http://localhost:5173
```

## Comptes Utilisateurs

Après synchronisation de la base de données, un compte administrateur est créé :

- **Username** : `directeur`
- **Password** : `Admin@2024`

## Rôles et Permissions

| Rôle | Modules Accessibles |
|------|---------------------|
| Maître-nageur | Piscine, Caisse |
| Serveuse | Restaurant, Caisse |
| Réceptionniste | Hôtel, Caisse |
| Gestionnaire Events | Événements, Caisse |
| Directeur | Tous les modules, Administration |
| Maire | Tous les modules (lecture seule) |

## Fonctionnalités Principales

### Module Piscine
- Vente de tickets (Adulte/Enfant)
- Gestion des abonnements (Mensuel/Trimestriel/Annuel)
- Statistiques journalières

### Module Restaurant
- Menu avec catégories
- Système de panier
- Gestion des ventes

### Module Hôtel
- Gestion des 7 chambres
- Réservations
- Check-in / Check-out
- Disponibilité en temps réel

### Module Événements
- Calendrier des événements
- Gestion des espaces
- Création de devis

### Caisse
- Clôture de caisse par module
- Calcul automatique des écarts
- Validation par le directeur

### Mode Hors Ligne
- Enregistrement des transactions en local
- Synchronisation automatique au retour en ligne
- Indicateur visuel du statut de connexion

## Structure du Projet

```
Piscine_de_Ouangolo/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration DB et Auth
│   │   ├── controllers/     # Logique métier
│   │   ├── middlewares/     # Auth, RBAC, Audit
│   │   ├── models/          # Modèles Sequelize
│   │   ├── routes/          # Routes API
│   │   └── app.js           # Point d'entrée
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── contexts/        # AuthContext
│   │   ├── hooks/           # Hooks personnalisés
│   │   ├── pages/           # Pages de l'application
│   │   ├── services/        # API et sync offline
│   │   └── types/           # Types TypeScript
│   └── package.json
│
└── database/
    └── schema.sql           # Schéma MySQL
```

## API Endpoints

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Profil utilisateur

### Piscine
- `GET /api/piscine/prices` - Prix des tickets
- `POST /api/piscine/tickets` - Vendre un ticket
- `GET /api/piscine/tickets` - Liste des ventes
- `POST /api/piscine/subscriptions` - Créer un abonnement

### Restaurant
- `GET /api/restaurant/menu` - Menu
- `POST /api/restaurant/sales` - Enregistrer une vente

### Hôtel
- `GET /api/hotel/rooms` - Chambres
- `POST /api/hotel/reservations` - Nouvelle réservation
- `PUT /api/hotel/reservations/:id/checkin` - Check-in
- `PUT /api/hotel/reservations/:id/checkout` - Check-out

### Événements
- `GET /api/events` - Liste des événements
- `POST /api/events` - Créer un événement
- `POST /api/events/:id/quotes` - Créer un devis

### Caisse
- `POST /api/caisse/close` - Clôturer la caisse
- `PUT /api/caisse/:id/validate` - Valider une clôture

### Dashboard
- `GET /api/dashboard` - Statistiques globales
- `GET /api/dashboard/reports` - Rapports détaillés

## Scripts Disponibles

### Backend
```bash
npm run dev      # Démarrage en mode développement
npm run start    # Démarrage en production
npm run db:sync  # Synchronisation de la base de données
```

### Frontend
```bash
npm run dev      # Démarrage en mode développement
npm run build    # Build de production
npm run preview  # Prévisualisation du build
```

## Production

### Backend
```bash
cd backend
npm install --production
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Déployer le contenu du dossier dist/
```
