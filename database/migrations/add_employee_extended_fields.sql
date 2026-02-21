-- Migration: Ajout des champs etendus pour les employes
-- Date: 2026-02-21
-- Description: Piece d'identite, infos personnelles, contact d'urgence, type de contrat

-- Section: Infos professionnelles supplementaires
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'cdi';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS end_contract_date DATE;

-- Section: Piece d'identite
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_type VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_issue_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_expiry_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_issued_by VARCHAR(100);

-- Section: Informations personnelles
ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_place VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;

-- Section: Contact d'urgence & Famille
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0;

-- Notes internes
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;
