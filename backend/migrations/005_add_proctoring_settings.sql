-- Migration 005: Add granular proctoring settings to tests table
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detect_tab_switch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS block_copy_paste BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_violations INT DEFAULT 3;
