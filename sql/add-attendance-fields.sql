-- Add new fields to attendance table for overtime and auto-punchout tracking

-- Add overtime minutes field
ALTER TABLE attendance 
ADD COLUMN overtimeMinutes INT NOT NULL DEFAULT 0
COMMENT 'Overtime minutes calculated';

-- Add auto-punchout field
ALTER TABLE attendance
ADD COLUMN autoPunchout BOOLEAN NOT NULL DEFAULT FALSE
COMMENT 'Whether punchout was automatic';

-- Create indexes for better performance
CREATE INDEX idx_attendance_overtime ON attendance(overtimeMinutes);
CREATE INDEX idx_attendance_autopunchout ON attendance(autoPunchout);
