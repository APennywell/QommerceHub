-- Add barcode column to inventory if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inventory' AND column_name = 'barcode'
    ) THEN
        ALTER TABLE inventory ADD COLUMN barcode VARCHAR(100);
    END IF;
END $$;

-- Create index for barcode if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(tenant_id, barcode);
