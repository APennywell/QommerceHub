-- Migration to fix tenant column names for authentication
-- Adds password_hash and store_name columns that the code expects

-- Add password_hash column if it doesn't exist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add store_name column if it doesn't exist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS store_name VARCHAR(200);

-- Copy data from existing columns to new columns (for existing records)
-- Using DO block to handle cases where source columns may not exist
DO $$
BEGIN
    -- Try to copy from password column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'password') THEN
        UPDATE tenants SET password_hash = password WHERE password_hash IS NULL;
    END IF;

    -- Try to copy from company_name or name columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'company_name') THEN
        UPDATE tenants SET store_name = company_name WHERE store_name IS NULL AND company_name IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'name') THEN
        UPDATE tenants SET store_name = name WHERE store_name IS NULL AND name IS NOT NULL;
    END IF;
END $$;

-- Add index for store_name if not exists
CREATE INDEX IF NOT EXISTS idx_tenants_store_name ON tenants(store_name);
