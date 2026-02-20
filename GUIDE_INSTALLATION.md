# Guide d'Installation — Système de Gestion Ouangolo
> Ce document contient toutes les commandes nécessaires pour installer l'application du début à la fin, avec l'explication de chaque étape.

---

## PRÉREQUIS
Avant de commencer, installer ces deux logiciels sur le PC :
- **Node.js v18+** → https://nodejs.org (version LTS)
- **PostgreSQL 15+** → https://www.postgresql.org/download/windows/

> ⚠️ **Important :** L'application utilise **PostgreSQL** (pas MySQL). Bien télécharger PostgreSQL.

Pour vérifier qu'ils sont bien installés, ouvrir un terminal (cmd) et taper :
```
node --version
npm --version
psql --version
```
Chaque commande doit afficher un numéro de version. Si ce n'est pas le cas, le logiciel n'est pas installé.

---

## ETAPE 1 — Créer la base de données
> La base de données est l'endroit où toutes les informations de l'application sont stockées (tickets, réservations, ventes, utilisateurs...). Cette commande crée une base de données vide appelée `ouangolo_db`.

```
psql -U postgres -c "CREATE DATABASE ouangolo_db;"
```
*(Le terminal peut demander le mot de passe PostgreSQL que tu as défini lors de l'installation)*

**Résultat attendu :** `CREATE DATABASE`

---

## ETAPE 2 — Préparer la base de données (créer les tables)
> Se déplacer dans le dossier backend de l'application. C'est comme ouvrir un dossier dans l'explorateur Windows, mais en ligne de commande.

```
cd D:\Piscine_de_Ouangolo\backend
```

> Cette commande lit le code de l'application et crée automatiquement toutes les tables dans la base de données (table des tickets, des chambres, du menu restaurant, des utilisateurs...). Elle crée aussi le compte administrateur par défaut.

```
npm run db:sync
```

**Résultat attendu :** `✅ Database synchronized` et `🎉 Database setup complete!`

---

## ETAPE 3 — Tester le Backend (serveur)
> Lance le serveur backend pour vérifier qu'il fonctionne correctement avant de passer à la suite. Le backend est la partie qui gère toute la logique de l'application et communique avec la base de données.

```
npm run dev
```

**Résultat attendu :** `Server running on port 3001`

> ⚠️ Ce test est temporaire. On va l'arrêter avec **Ctrl+C** après vérification, car on utilisera PM2 plus tard pour le lancer définitivement.

---

## ETAPE 4 — Installer les dépendances du Frontend
> Ouvrir un **2ème terminal** (sans fermer le premier), puis se déplacer dans le dossier frontend. Le frontend est la partie visuelle de l'application que l'utilisateur voit dans le navigateur.

```
cd D:\Piscine_de_Ouangolo\frontend
```

> Télécharge et installe tous les packages (bibliothèques) nécessaires au bon fonctionnement du frontend. Cette commande est à faire **une seule fois**.

```
npm install
```

---

## ETAPE 5 — Tester le Frontend
> Lance le frontend en mode développement pour vérifier que tout fonctionne. L'application sera accessible sur http://localhost:5173

```
npm run dev
```

Ouvrir le navigateur sur `http://localhost:5173` et se connecter avec :
- **Username** : `directeur`
- **Password** : `Admin@2024`

> ⚠️ Ce test est temporaire. Arrêter avec **Ctrl+C** après vérification.

---

## ETAPE 6 — Compiler le Frontend pour la production
> Compile et optimise tout le code du frontend en fichiers statiques prêts pour la production. Le résultat est stocké dans un dossier `dist/`. C'est cette version compilée que PM2 va servir aux utilisateurs.

```
npm run build
```

**Résultat attendu :** Création d'un dossier `dist/` dans le répertoire frontend.

---

## ETAPE 7 — Installer PM2 et ses outils
> PM2 est un gestionnaire de processus. Il permet de lancer le backend et le frontend automatiquement au démarrage du PC, même après une coupure de courant, sans intervention manuelle.

> Installe PM2 globalement sur le PC :
```
npm install -g pm2
```

> Installe le plugin PM2 spécifique à Windows pour le démarrage automatique :
```
npm install -g pm2-windows-startup
```

> Active le démarrage automatique de PM2 au lancement de Windows :
```
pm2-startup install
```

> Installe `serve`, un serveur de fichiers statiques qui va afficher le frontend compilé :
```
npm install -g serve
```

---

## ETAPE 8 — Lancer le Backend avec PM2
> Se déplacer dans le dossier backend :
```
cd D:\Piscine_de_Ouangolo\backend
```

> Lance le serveur backend avec PM2 et lui donne le nom "backend" pour pouvoir le gérer facilement. Il tourne en arrière-plan sur http://localhost:3001

> ⚠️ **Important :** La commande s'écrit exactement ainsi (avec `--` avant `run dev`). Ne pas écrire `"npm run dev"` entre guillemets car cela provoque une erreur.

```
pm2 start npm --name backend -- run dev
```

**Résultat attendu :** Un tableau avec `backend` en vert et le statut `online`.

---

## ETAPE 9 — Lancer le Frontend avec PM2
> Se déplacer dans le dossier frontend :
```
cd D:\Piscine_de_Ouangolo\frontend
```

> Lance le serveur frontend avec PM2. Il sert les fichiers compilés du dossier `dist/` sur le port 5173.
```
pm2 serve dist 5173 --name frontend
```

**Résultat attendu :** Un tableau avec `frontend` en vert et le statut `online`.

---

## ETAPE 10 — Sauvegarder la configuration PM2
> Sauvegarde la liste des processus PM2 (backend + frontend). Grâce à cette commande, après une coupure de courant ou un redémarrage du PC, PM2 relance automatiquement les deux serveurs sans intervention.

```
pm2 save
```

---

## CONNEXION À L'APPLICATION

Ouvrir le navigateur et aller sur :
```
http://localhost:5173
```

Se connecter avec :
- **Username** : `directeur`
- **Password** : `Admin@2024`

---

## CHANGER L'URL DE L'APPLICATION (URL PERSONNALISÉE)
> Par défaut l'application est accessible sur `http://localhost:5173`. Si tu veux utiliser une adresse personnalisée comme `http://gestion.piscine.ouangolo` sur le réseau local, suis ces étapes.

**Sur chaque PC du réseau qui doit accéder à l'application :**

1. Ouvrir le **Bloc-notes en tant qu'Administrateur** (clic droit → Exécuter en tant qu'administrateur)
2. Ouvrir le fichier : `C:\Windows\System32\drivers\etc\hosts`
3. Ajouter cette ligne à la fin du fichier (remplacer par l'IP réelle du PC serveur) :

```
192.168.1.XX    gestion.piscine.ouangolo
```

4. Sauvegarder le fichier

Ensuite dans le navigateur, taper :
```
http://gestion.piscine.ouangolo:5173
```

> Pour connaître l'adresse IP du PC serveur, taper dans le terminal :
```
ipconfig
```
Chercher la ligne `Adresse IPv4` — exemple : `192.168.1.10`

---

## COMMANDES UTILES PM2

> Voir l'état de tous les serveurs (backend et frontend) :
```
pm2 list
```

> Voir les logs en cas de problème :
```
pm2 logs
```

> Voir les logs d'un serveur spécifique :
```
pm2 logs backend
pm2 logs frontend
```

> Redémarrer un serveur :
```
pm2 restart backend
pm2 restart frontend
```

> Arrêter tous les serveurs :
```
pm2 stop all
```

> Supprimer un serveur de PM2 (en cas d'erreur, pour recommencer) :
```
pm2 delete backend
pm2 delete frontend
```

---

## FICHIER DE CONFIGURATION (.env)
> Ce fichier contient les paramètres de connexion à la base de données. Il faut **adapter le mot de passe** sur chaque nouveau PC selon le mot de passe PostgreSQL défini lors de l'installation.

Fichier situé à : `D:\Piscine_de_Ouangolo\backend\.env`

```
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ouangolo_db
DB_USER=postgres
DB_PASSWORD=MOT_DE_PASSE_POSTGRESQL   ← changer ici

JWT_SECRET=ouangolo_super_secret_key_change_in_production_2024
JWT_EXPIRES_IN=24h

FRONTEND_URL=http://localhost:5173
```

---

## ROLES ET ACCÈS

| Rôle                | Accès                                    |
|---------------------|------------------------------------------|
| directeur           | Tous les modules + Administration        |
| Maître-nageur       | Piscine, Caisse                          |
| Serveuse            | Restaurant, Caisse                       |
| Réceptionniste      | Hôtel, Caisse                            |
| Gestionnaire Events | Événements, Caisse                       |
| Maire               | Tous les modules (lecture seule)         |

---

## RÉSUMÉ — ORDRE DES COMMANDES

```
1.  psql -U postgres -c "CREATE DATABASE ouangolo_db;"
2.  cd D:\Piscine_de_Ouangolo\backend
3.  npm run db:sync
4.  cd D:\Piscine_de_Ouangolo\frontend
5.  npm install
6.  npm run build
7.  npm install -g pm2
8.  npm install -g pm2-windows-startup
9.  pm2-startup install
10. npm install -g serve
11. cd D:\Piscine_de_Ouangolo\backend
12. pm2 start npm --name backend -- run dev
13. cd D:\Piscine_de_Ouangolo\frontend
14. pm2 serve dist 5173 --name frontend
15. pm2 save
```

---

*Document créé le 20/02/2026*
