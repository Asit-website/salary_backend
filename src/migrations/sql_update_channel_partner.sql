-- SQL Queries to update the database for Channel Partner role

-- 1. Update the role ENUM in users table
ALTER TABLE users MODIFY COLUMN role ENUM('superadmin', 'admin', 'staff', 'channel_partner') NOT NULL;

-- 2. Add channel_partner_id column to users table
ALTER TABLE users ADD COLUMN channel_partner_id VARCHAR(100) NULL AFTER org_account_id;

-- 3. Example: Assign a Channel Partner ID to an existing user (if you want to test)
-- UPDATE users SET role = 'channel_partner', channel_partner_id = 'partner123' WHERE phone = 'YOUR_PHONE_NUMBER';
