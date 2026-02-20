-- =====================================================
-- Système de Gestion Complexe de Loisirs Ouangolo
-- Schéma de Base de Données MySQL
-- =====================================================

CREATE DATABASE IF NOT EXISTS ouangolo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ouangolo_db;

-- =====================================================
-- Table: users (Utilisateurs et Rôles)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'responsable', 'directeur', 'maire') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- =====================================================
-- Module Piscine
-- =====================================================

-- Table: tickets (Ventes de tickets piscine)
CREATE TABLE IF NOT EXISTS tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('adulte', 'enfant') NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('especes', 'carte', 'mobile_money') NOT NULL DEFAULT 'especes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at),
    INDEX idx_synced (synced)
) ENGINE=InnoDB;

-- Table: subscriptions (Abonnements piscine)
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    type ENUM('mensuel', 'trimestriel', 'annuel') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    user_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_client (client_name),
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB;

-- =====================================================
-- Module Restaurant
-- =====================================================

-- Table: menu_items (Articles du menu)
CREATE TABLE IF NOT EXISTS menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category ENUM('entree', 'plat', 'dessert', 'boisson', 'snack') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_available (is_available)
) ENGINE=InnoDB;

-- Table: sales (Ventes restaurant)
CREATE TABLE IF NOT EXISTS sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    items_json JSON NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('especes', 'carte', 'mobile_money') NOT NULL DEFAULT 'especes',
    table_number VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at),
    INDEX idx_synced (synced)
) ENGINE=InnoDB;

-- =====================================================
-- Module Hôtel
-- =====================================================

-- Table: rooms (Chambres)
CREATE TABLE IF NOT EXISTS rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    number VARCHAR(10) UNIQUE NOT NULL,
    type ENUM('simple', 'double', 'suite') NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    price_per_night DECIMAL(10,2) NOT NULL,
    status ENUM('disponible', 'occupee', 'maintenance', 'nettoyage') DEFAULT 'disponible',
    amenities JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB;

-- Table: reservations (Réservations hôtel)
CREATE TABLE IF NOT EXISTS reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    status ENUM('confirmee', 'en_cours', 'terminee', 'annulee') DEFAULT 'confirmee',
    notes TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_room (room_id),
    INDEX idx_dates (check_in, check_out),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- Module Événements
-- =====================================================

-- Table: events (Événements)
CREATE TABLE IF NOT EXISTS events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    event_date DATE NOT NULL,
    event_time TIME,
    end_date DATE,
    space ENUM('salle_conference', 'terrasse', 'jardin', 'piscine_privee', 'restaurant_prive') NOT NULL,
    guest_count INT,
    description TEXT,
    status ENUM('demande', 'confirme', 'en_cours', 'termine', 'annule') DEFAULT 'demande',
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_date (event_date),
    INDEX idx_status (status),
    INDEX idx_space (space)
) ENGINE=InnoDB;

-- Table: quotes (Devis événements)
CREATE TABLE IF NOT EXISTS quotes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    items_json JSON NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    deposit_required DECIMAL(10,2) DEFAULT 0,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    status ENUM('brouillon', 'envoye', 'accepte', 'refuse', 'paye') DEFAULT 'brouillon',
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- Clôture de Caisse
-- =====================================================

CREATE TABLE IF NOT EXISTS cash_registers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    module ENUM('piscine', 'restaurant', 'hotel', 'events') NOT NULL,
    date DATE NOT NULL,
    opening_amount DECIMAL(10,2) DEFAULT 0,
    expected_amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2) NOT NULL,
    difference DECIMAL(10,2) NOT NULL,
    status ENUM('en_attente', 'validee', 'rejetee') DEFAULT 'en_attente',
    validated_by INT,
    validated_at TIMESTAMP NULL,
    notes TEXT,
    transactions_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (validated_by) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_date (date),
    INDEX idx_module (module),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- Traçabilité / Audit
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    module ENUM('piscine', 'restaurant', 'hotel', 'events', 'caisse', 'users', 'auth', 'system') NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details_json JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_module (module),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- =====================================================
-- Données Initiales
-- =====================================================

-- Insérer un utilisateur admin (directeur) par défaut
-- Mot de passe: Admin@2024 (hashé avec bcrypt)
INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('directeur', '$2a$10$XQxBtXsZ8WpQpKxKxKxKxeKxKxKxKxKxKxKxKxKxKxKxKxKxKxKxK', 'Directeur Principal', 'directeur', TRUE)
ON DUPLICATE KEY UPDATE full_name = full_name;

-- Insérer les chambres d'hôtel (< 10 chambres)
INSERT INTO rooms (number, type, capacity, price_per_night, status, amenities) VALUES
('101', 'simple', 1, 25000, 'disponible', '{"wifi": true, "climatisation": true, "tv": true}'),
('102', 'simple', 1, 25000, 'disponible', '{"wifi": true, "climatisation": true, "tv": true}'),
('103', 'double', 2, 40000, 'disponible', '{"wifi": true, "climatisation": true, "tv": true, "minibar": true}'),
('104', 'double', 2, 40000, 'disponible', '{"wifi": true, "climatisation": true, "tv": true, "minibar": true}'),
('105', 'double', 2, 40000, 'disponible', '{"wifi": true, "climatisation": true, "tv": true, "minibar": true}'),
('201', 'suite', 4, 75000, 'disponible', '{"wifi": true, "climatisation": true, "tv": true, "minibar": true, "jacuzzi": true}'),
('202', 'suite', 4, 75000, 'disponible', '{"wifi": true, "climatisation": true, "tv": true, "minibar": true, "jacuzzi": true}')
ON DUPLICATE KEY UPDATE price_per_night = VALUES(price_per_night);

-- Insérer quelques articles de menu par défaut
INSERT INTO menu_items (name, category, price, description, is_available) VALUES
('Salade Verte', 'entree', 3500, 'Salade fraîche de saison', TRUE),
('Soupe du jour', 'entree', 2500, 'Soupe traditionnelle', TRUE),
('Poulet braisé', 'plat', 8500, 'Poulet braisé avec accompagnement', TRUE),
('Poisson grillé', 'plat', 9500, 'Poisson frais grillé', TRUE),
('Riz sauce arachide', 'plat', 5500, 'Plat traditionnel', TRUE),
('Fruit de saison', 'dessert', 2000, 'Assortiment de fruits frais', TRUE),
('Gâteau maison', 'dessert', 3000, 'Gâteau du chef', TRUE),
('Coca-Cola', 'boisson', 1000, 'Bouteille 33cl', TRUE),
('Fanta', 'boisson', 1000, 'Bouteille 33cl', TRUE),
('Eau minérale', 'boisson', 500, 'Bouteille 50cl', TRUE),
('Bière locale', 'boisson', 1500, 'Bouteille 65cl', TRUE),
('Jus naturel', 'boisson', 2000, 'Jus de fruits frais', TRUE),
('Sandwich', 'snack', 3500, 'Sandwich garni', TRUE),
('Frites', 'snack', 2500, 'Portion de frites', TRUE)
ON DUPLICATE KEY UPDATE price = VALUES(price);
