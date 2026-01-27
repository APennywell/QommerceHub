-- Email Verification for Tenant Signup
-- Adds email_verified flag and verification token fields

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMP;

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_tenants_verification_token ON tenants(verification_token) WHERE verification_token IS NOT NULL;

-- Update existing tenants to be verified (grandfathered in)
UPDATE tenants SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;
