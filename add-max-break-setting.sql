-- Add MAX_BREAK_DURATION setting to app_settings table
-- This sets the default maximum allowed break duration to 30 minutes

INSERT INTO app_settings (key, value, created_at, updated_at) 
VALUES ('MAX_BREAK_DURATION', '30', NOW(), NOW())
ON DUPLICATE KEY UPDATE value = '30', updated_at = NOW();
