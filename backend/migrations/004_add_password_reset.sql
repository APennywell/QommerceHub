-- Add password reset columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_tenants_reset_token ON tenants(reset_token);
