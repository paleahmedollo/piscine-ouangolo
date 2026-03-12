-- =============================================================================
-- SCRIPT DE RESTAURATION DES COMPTES PAR DÉFAUT
-- À exécuter directement dans la console SQL de Render (ou pgAdmin)
-- sur les bases ollentra-db (production) ET ollentra-demo-db (UAT/staging)
-- =============================================================================

-- 1. S'assurer que la company de base existe (id=1)
INSERT INTO companies (id, name, code, address, plan, is_active, created_at, updated_at)
VALUES (1, 'Piscine de Ouangolo', 'OUANGOLO', 'Ouangolodougou, Côte d''Ivoire', 'basic', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Reset la séquence si nécessaire
SELECT setval('companies_id_seq', GREATEST((SELECT MAX(id) FROM companies), 1));

-- 2. Restaurer / créer les comptes par défaut
-- Les mots de passe sont déjà hashés en bcrypt (salt=10)

-- superadmin / Gestix@2026
INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
VALUES (
  'superadmin',
  '$2a$10$0IzO/Rnte.2JYUHyaXyRoOto9KDykUXXCrB/puC7cghmEW/6gc/xS',
  'Super Administrateur Ollentra',
  'super_admin',
  true, NULL, NOW(), NOW()
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = '$2a$10$0IzO/Rnte.2JYUHyaXyRoOto9KDykUXXCrB/puC7cghmEW/6gc/xS',
      is_active = true,
      updated_at = NOW();

-- paleadmin / PaleAdmin@2026
INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
VALUES (
  'paleadmin',
  '$2a$10$opbiW7AEtcS3YxO.o1DGye4qbxriMIXB/Cr/KnpZUyGXAAHKJozSC',
  'Pale Ahmed - Administrateur Général',
  'admin',
  true, 1, NOW(), NOW()
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = '$2a$10$opbiW7AEtcS3YxO.o1DGye4qbxriMIXB/Cr/KnpZUyGXAAHKJozSC',
      is_active = true,
      updated_at = NOW();

-- admin.pmdo / pmdo@2026
INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
VALUES (
  'admin.pmdo',
  '$2a$10$2AlQh3y1RjdmrhuQhEKMUeIadIt5zVkb2bHGWegi9rvxe1WVa.0aK',
  'Administrateur',
  'admin',
  true, 1, NOW(), NOW()
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = '$2a$10$2AlQh3y1RjdmrhuQhEKMUeIadIt5zVkb2bHGWegi9rvxe1WVa.0aK',
      is_active = true,
      updated_at = NOW();

-- gerant.pmdo / pmdo@2026
INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
VALUES (
  'gerant.pmdo',
  '$2a$10$EFSXf8mXE0xoFFmLZg4D..ozuCUph64yH9BfxkNdH9UNcamDgEBA2',
  'Gérant Principal',
  'gerant',
  true, 1, NOW(), NOW()
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = '$2a$10$EFSXf8mXE0xoFFmLZg4D..ozuCUph64yH9BfxkNdH9UNcamDgEBA2',
      is_active = true,
      updated_at = NOW();

-- directeur / Admin@2024
INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
VALUES (
  'directeur',
  '$2a$10$hhwTf1GSkfxdDY1idPXsmuY5f/0VFrqn/PNctwEWAt1qBVqKmDsfO',
  'Pale Ahmed - Administrateur Général',
  'admin',
  true, 1, NOW(), NOW()
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = '$2a$10$hhwTf1GSkfxdDY1idPXsmuY5f/0VFrqn/PNctwEWAt1qBVqKmDsfO',
      is_active = true,
      updated_at = NOW();

-- 3. Vérification finale
SELECT id, username, role, is_active, company_id FROM users
WHERE username IN ('superadmin','paleadmin','admin.pmdo','gerant.pmdo','directeur')
ORDER BY id;
