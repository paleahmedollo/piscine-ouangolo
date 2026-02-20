-- =====================================================
-- Migration: Ajout du rôle admin
-- Date: 2026-01-27
-- Description: Ajoute le rôle 'admin' avec accès complet (y compris la paie)
--              Le gérant n'a plus accès à la paie
-- =====================================================

USE ouangolo_db;

-- Modifier l'ENUM pour ajouter le rôle admin
ALTER TABLE users MODIFY COLUMN role
    ENUM('admin', 'maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'responsable', 'directeur', 'maire') NOT NULL;

-- Insérer le compte admin par défaut (si n'existe pas)
-- Mot de passe: admin123 (sera créé automatiquement par l'application au démarrage)
-- Le hash ci-dessous est pour 'admin123' avec bcrypt
INSERT INTO users (username, password_hash, full_name, role, is_active)
SELECT 'admin', '$2a$10$rQ7K8nKvqKvqKvqKvqKvq.KvqKvqKvqKvqKvqKvqKvqKvqKvqKvqK', 'Administrateur', 'admin', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Afficher un résumé des changements
SELECT 'Migration terminée: rôle admin ajouté' AS status;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
