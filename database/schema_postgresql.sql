-- =====================================================
-- Piscine de Ouangolo - Schema PostgreSQL (Supabase)
-- =====================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin','maitre_nageur','serveuse','serveur','receptionniste','gestionnaire_events','gerant','responsable','directeur','maire')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets piscine
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('adulte','enfant')),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'especes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE
);

-- Abonnements piscine
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    type VARCHAR(20) NOT NULL CHECK (type IN ('mensuel','trimestriel','annuel')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    user_id INT NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE
);

-- Menu restaurant
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('entree','plat','dessert','boisson','snack')),
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ventes restaurant
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    items_json JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(10) DEFAULT 'none',
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'especes',
    table_number VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE
);

-- Chambres hotel
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    number VARCHAR(10) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('simple','double','suite')),
    capacity INT NOT NULL DEFAULT 2,
    price_per_night DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'disponible' CHECK (status IN ('disponible','occupee','maintenance','nettoyage')),
    amenities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations hotel
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES rooms(id),
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'confirmee' CHECK (status IN ('confirmee','en_cours','terminee','annulee')),
    notes TEXT,
    user_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE
);

-- Evenements
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    event_date DATE NOT NULL,
    event_time TIME,
    end_date DATE,
    space VARCHAR(30) NOT NULL CHECK (space IN ('salle_conference','terrasse','jardin','piscine_privee','restaurant_prive')),
    guest_count INT,
    description TEXT,
    status VARCHAR(20) DEFAULT 'demande' CHECK (status IN ('demande','confirme','en_cours','termine','annule')),
    user_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE
);

-- Devis evenements
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    items_json JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    deposit_required DECIMAL(10,2) DEFAULT 0,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'brouillon' CHECK (status IN ('brouillon','envoye','accepte','refuse','paye')),
    valid_until DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE
);

-- Cloture de caisse
CREATE TABLE IF NOT EXISTS cash_registers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    module VARCHAR(20) NOT NULL CHECK (module IN ('piscine','restaurant','hotel','events')),
    date DATE NOT NULL,
    opening_amount DECIMAL(10,2) DEFAULT 0,
    expected_amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2) NOT NULL,
    difference DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente','validee','rejetee')),
    validated_by INT REFERENCES users(id),
    validated_at TIMESTAMP,
    notes TEXT,
    transactions_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced BOOLEAN DEFAULT TRUE
);

-- Recus
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    cash_register_id INT REFERENCES cash_registers(id),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    module VARCHAR(20) NOT NULL,
    validated_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    module VARCHAR(30) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details_json JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employes
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    hire_date DATE NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fiches de paie
CREATE TABLE IF NOT EXISTS payrolls (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INT NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL,
    bonus DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente','paye','annule')),
    payment_date DATE,
    payment_method VARCHAR(20) DEFAULT 'especes',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, period_month, period_year)
);

-- Depenses
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'especes',
    expense_date DATE NOT NULL,
    receipt_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Layouts rapports
CREATE TABLE IF NOT EXISTS user_layouts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    layout_name VARCHAR(100) NOT NULL,
    columns JSONB NOT NULL,
    filters JSONB,
    sort_by VARCHAR(50) DEFAULT 'date',
    sort_order VARCHAR(4) DEFAULT 'DESC',
    rows_per_page INT DEFAULT 50,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'low',
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Donnees initiales
-- =====================================================

-- Compte admin (mot de passe: Admin@2024)
INSERT INTO users (username, password_hash, full_name, role, is_active)
VALUES ('admin', '$2a$10$3LuPWikPKfbF3Y0FJQPhnOm5rs5gDuYoLSgFcc2Y3U5CveyEoprPi', 'Administrateur', 'admin', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Chambres hotel
INSERT INTO rooms (number, type, capacity, price_per_night, status, amenities) VALUES
('101', 'simple', 1, 25000, 'disponible', '{"wifi":true,"climatisation":true,"tv":true}'),
('102', 'simple', 1, 25000, 'disponible', '{"wifi":true,"climatisation":true,"tv":true}'),
('103', 'double', 2, 40000, 'disponible', '{"wifi":true,"climatisation":true,"tv":true,"minibar":true}'),
('104', 'double', 2, 40000, 'disponible', '{"wifi":true,"climatisation":true,"tv":true,"minibar":true}'),
('105', 'double', 2, 40000, 'disponible', '{"wifi":true,"climatisation":true,"tv":true,"minibar":true}'),
('201', 'suite', 4, 75000, 'disponible', '{"wifi":true,"climatisation":true,"tv":true,"minibar":true,"jacuzzi":true}'),
('202', 'suite', 4, 75000, 'disponible', '{"wifi":true,"climatisation":true,"tv":true,"minibar":true,"jacuzzi":true}')
ON CONFLICT (number) DO NOTHING;

-- Menu restaurant
INSERT INTO menu_items (name, category, price, description, is_available) VALUES
('Salade Verte', 'entree', 3500, 'Salade fraiche de saison', TRUE),
('Soupe du jour', 'entree', 2500, 'Soupe traditionnelle', TRUE),
('Poulet braise', 'plat', 8500, 'Poulet braise avec accompagnement', TRUE),
('Poisson grille', 'plat', 9500, 'Poisson frais grille', TRUE),
('Riz sauce arachide', 'plat', 5500, 'Plat traditionnel', TRUE),
('Fruit de saison', 'dessert', 2000, 'Assortiment de fruits frais', TRUE),
('Gateau maison', 'dessert', 3000, 'Gateau du chef', TRUE),
('Coca-Cola', 'boisson', 1000, 'Bouteille 33cl', TRUE),
('Fanta', 'boisson', 1000, 'Bouteille 33cl', TRUE),
('Eau minerale', 'boisson', 500, 'Bouteille 50cl', TRUE),
('Biere locale', 'boisson', 1500, 'Bouteille 65cl', TRUE),
('Jus naturel', 'boisson', 2000, 'Jus de fruits frais', TRUE),
('Sandwich', 'snack', 3500, 'Sandwich garni', TRUE),
('Frites', 'snack', 2500, 'Portion de frites', TRUE)
ON CONFLICT DO NOTHING;
