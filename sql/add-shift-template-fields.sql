-- Add new fields to shift_templates table for half-day, overtime, and auto-punchout rules

-- Add half-day threshold field
ALTER TABLE shift_templates 
ADD COLUMN halfDayThresholdMinutes INT NULL 
COMMENT 'Minutes below which attendance is marked as half-day';

-- Add overtime start field  
ALTER TABLE shift_templates
ADD COLUMN overtimeStartMinutes INT NULL
COMMENT 'Minutes after which overtime starts';

-- Add auto-punchout field
ALTER TABLE shift_templates
ADD COLUMN autoPunchoutAfterShiftEnd DECIMAL(4,1) NULL
COMMENT 'Hours after shift end when auto-punchout should occur';

-- Create indexes for better performance
CREATE INDEX idx_shift_templates_halfday ON shift_templates(halfDayThresholdMinutes);
CREATE INDEX idx_shift_templates_overtime ON shift_templates(overtimeStartMinutes);
CREATE INDEX idx_shift_templates_autopunchout ON shift_templates(autoPunchoutAfterShiftEnd);
