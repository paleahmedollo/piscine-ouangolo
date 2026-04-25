# OLLENTRA — Accès & Environnements
> Document confidentiel · Mise à jour : 12 mars 2026

---

## 1. PRODUCTION
> Branche `main` · Déploiement automatique sur push

| | |
|---|---|
| **URL** | https://ollentra.onrender.com |
| **Base de données** | `ollentra-db` · PostgreSQL · Frankfurt |
| **Node** | 20 LTS |

### Comptes système (créés automatiquement au démarrage)

| Rôle | Username | Mot de passe | Accès |
|------|----------|--------------|-------|
| Super Admin | `superadmin` | `Gestix@2026` | Toutes entreprises, configuration globale |
| Admin Général | `paleadmin` | `PaleAdmin@2026` | Administration complète |
| Admin | `admin.pmdo` | `pmdo@2026` | Administration |
| Gérant | `gerant.pmdo` | `pmdo@2026` | Gestion opérationnelle |
| Directeur | `directeur` | `Admin@2024` | Direction + rapports |

---

## 2. STAGING / UAT (Démonstration clients)
> Branche `uat` · Déploiement automatique sur push · **Base de données isolée**

| | |
|---|---|
| **URL** | https://ollentra-staging.onrender.com |
| **Base de données** | `ollentra-demo-db` · PostgreSQL · Oregon |
| **Entreprise démo** | Complexe Beau Rivage *(données fictives pré-remplies)* |

### Comptes système (identiques à la production)

| Rôle | Username | Mot de passe | Accès |
|------|----------|--------------|-------|
| Super Admin | `superadmin` | `Gestix@2026` | Création de nouveaux accès, config globale |
| Admin Général | `paleadmin` | `PaleAdmin@2026` | Administration complète |
| Admin | `admin.pmdo` | `pmdo@2026` | Administration |
| Gérant | `gerant.pmdo` | `pmdo@2026` | Gestion opérationnelle |
| Directeur | `directeur` | `Admin@2024` | Direction + rapports |

### Comptes démo — Complexe Beau Rivage

| Rôle | Username | Mot de passe | Module principal |
|------|----------|--------------|-----------------|
| Directeur démo | `directeur.demo` | `Demo@2026` | Dashboard, tous modules |
| Serveuse | `serveuse.demo` | `Demo@2026` | Restaurant |
| Réception | `reception.demo` | `Demo@2026` | Hôtel, réservations |
| Maître-nageur | `maitrenageur.demo` | `Demo@2026` | Piscine, tickets |

> **Données pré-remplies :** 30 jours tickets piscine · 20 jours commandes restaurant · 8 réservations hôtel · 5 événements · 6 employés

---

## 3. WORKFLOW DE DÉPLOIEMENT

```
Développement  →  push sur uat  →  [Staging se déploie automatiquement]
                                          ↓
                               Tests & validation client
                                          ↓
               merge uat → main  →  [Production se déploie automatiquement]
```

> ⚠️  **Règle absolue :** Ne jamais pousser directement sur `main` sans validation UAT.

---

## 4. CRÉER DE NOUVEAUX ACCÈS SUR STAGING

1. Se connecter sur https://ollentra-staging.onrender.com avec `superadmin` / `Gestix@2026`
2. Menu **Super Admin → Utilisateurs → Nouvel utilisateur**
3. Attribuer le rôle souhaité et lier à l'entreprise "Complexe Beau Rivage"
4. Communiquer les identifiants au client pour sa période de test

---

*Ce document ne doit pas être partagé en dehors de l'équipe de gestion.*
