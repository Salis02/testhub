-- Migration 004: Ensure admin_audit_log timestamp column preserves timezone (TIMESTAMPTZ)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_audit_log' 
          AND column_name = 'created_at' 
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE admin_audit_log ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Asia/Jakarta';
    END IF;
END $$;
