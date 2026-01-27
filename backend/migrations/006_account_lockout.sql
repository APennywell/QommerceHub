-- Account Lockout for Brute Force Protection
-- Tracks failed login attempts and locks accounts after threshold

CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);

-- Add lockout fields to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0;

-- Cleanup old login attempts (run periodically)
-- DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '7 days';
