-- Add shift_template_id column to users table
ALTER TABLE users 
ADD COLUMN shift_template_id BIGINT(11) UNSIGNED NULL 
COMMENT 'Foreign key reference to shift_templates table';

-- Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_shift_template 
FOREIGN KEY (shift_template_id) REFERENCES shift_templates(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better performance
CREATE INDEX idx_users_shift_template_id ON users(shift_template_id);
