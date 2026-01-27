-- User Roles and Permissions System
-- Adds role-based access control to the platform

-- Create roles enum type (if not exists workaround for PostgreSQL)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role to tenants (users)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS parent_tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT TRUE;

-- Index for finding sub-users
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id) WHERE parent_tenant_id IS NOT NULL;

-- Set existing tenants as owners
UPDATE tenants SET role = 'owner' WHERE role IS NULL;

-- Permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    permission VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission)
);

-- Insert default permissions
INSERT INTO role_permissions (role, permission) VALUES
    -- Owner has all permissions
    ('owner', 'manage_users'),
    ('owner', 'manage_settings'),
    ('owner', 'manage_products'),
    ('owner', 'manage_orders'),
    ('owner', 'manage_customers'),
    ('owner', 'view_analytics'),
    ('owner', 'manage_payments'),
    ('owner', 'export_data'),
    -- Manager can manage operations
    ('manager', 'manage_products'),
    ('manager', 'manage_orders'),
    ('manager', 'manage_customers'),
    ('manager', 'view_analytics'),
    ('manager', 'export_data'),
    -- Staff has limited access
    ('staff', 'manage_orders'),
    ('staff', 'view_analytics')
ON CONFLICT (role, permission) DO NOTHING;
