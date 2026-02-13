-- Create StaffLoan table for loan management system
CREATE TABLE IF NOT EXISTS `staff_loans` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `staffId` INT(11) NOT NULL,
  `orgId` INT(11) NOT NULL,
  `loanType` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `interestRate` DECIMAL(5,2) NOT NULL DEFAULT '0.00',
  `tenure` INT(11) NOT NULL COMMENT 'Tenure in months',
  `emiAmount` DECIMAL(12,2) NOT NULL,
  `issueDate` DATE NOT NULL,
  `startDate` DATE NOT NULL,
  `status` ENUM('active', 'completed', 'defaulted') NOT NULL DEFAULT 'active',
  `purpose` TEXT NOT NULL,
  `notes` TEXT NULL,
  `createdBy` INT(11) NOT NULL,
  `updatedBy` INT(11) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_staff_loans_staffId` (`staffId`),
  KEY `idx_staff_loans_orgId` (`orgId`),
  KEY `idx_staff_loans_status` (`status`),
  KEY `idx_staff_loans_createdBy` (`createdBy`),
  KEY `idx_staff_loans_updatedBy` (`updatedBy`),
  KEY `idx_staff_loans_issueDate` (`issueDate`),
  KEY `idx_staff_loans_startDate` (`startDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraints (optional - remove if you don't want foreign keys)
-- ALTER TABLE `staff_loans` ADD CONSTRAINT `fk_staff_loans_staffId` FOREIGN KEY (`staffId`) REFERENCES `users`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `staff_loans` ADD CONSTRAINT `fk_staff_loans_orgId` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE;
-- ALTER TABLE `staff_loans` ADD CONSTRAINT `fk_staff_loans_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL;
-- ALTER TABLE `staff_loans` ADD CONSTRAINT `fk_staff_loans_updatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Insert sample data (optional - for testing)
INSERT INTO `staff_loans` (`staffId`, `orgId`, `loanType`, `amount`, `interestRate`, `tenure`, `emiAmount`, `issueDate`, `startDate`, `purpose`, `notes`, `createdBy`, `updatedBy`) VALUES
(1, 1, 'Personal Loan', 50000.00, 12.00, 12, 4442.44, '2024-01-15', '2024-02-01', 'Personal emergency fund', 'Monthly EMI deductions from salary', 1, 1),
(2, 1, 'Car Loan', 200000.00, 8.50, 36, 6314.12, '2024-01-20', '2024-02-01', 'Vehicle purchase', 'Deduct EMI from monthly salary', 1, 1),
(3, 1, 'Home Loan', 500000.00, 7.00, 120, 5816.78, '2024-01-10', '2024-02-01', 'Home renovation', 'Long-term loan with monthly deductions', 1, 1);

-- Query to verify table creation
SHOW CREATE TABLE `staff_loans`;

-- Query to verify data insertion
SELECT * FROM `staff_loans`;

-- Query to check indexes
SHOW INDEX FROM `staff_loans`;
