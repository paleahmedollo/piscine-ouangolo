INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
VALUES ('superadmin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Administrateur', 'super_admin', true, NULL, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
