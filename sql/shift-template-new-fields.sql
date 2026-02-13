-- SQL queries for the 3 new fields in shift_templates table (underscore format)

-- Add half-day threshold field
ALTER TABLE shift_templates 
ADD COLUMN half_day_threshold_minutes INT(11) NULL 
COMMENT 'Minutes below which attendance is marked as half-day';

-- Add overtime start field  
ALTER TABLE shift_templates 
ADD COLUMN overtime_start_minutes INT(11) NULL 
COMMENT 'Minutes after which overtime starts';

-- Add auto-punchout field
ALTER TABLE shift_templates 
ADD COLUMN auto_punchout_after_shift_end DECIMAL(4,1) NULL 
COMMENT 'Hours after shift end when auto-punchout should occur';

-- Create indexes for better performance
CREATE INDEX idx_shift_half_day ON shift_templates(half_day_threshold_minutes);
CREATE INDEX idx_shift_overtime ON shift_templates(overtime_start_minutes);
CREATE INDEX idx_shift_auto_punchout ON shift_templates(auto_punchout_after_shift_end);
