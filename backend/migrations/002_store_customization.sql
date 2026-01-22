-- Store Customization Feature
-- Allows tenants to customize their store appearance

-- First, add any missing columns from initial schema (in case DB was created earlier)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Create index for reset_token if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_tenants_reset_token ON tenants(reset_token);

-- Add customization columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS background_color VARCHAR(7) DEFAULT '#f9fafb';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS background_image_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#667eea';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#764ba2';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#10b981';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS text_color VARCHAR(7) DEFAULT '#111827';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS animations_enabled BOOLEAN DEFAULT TRUE;
