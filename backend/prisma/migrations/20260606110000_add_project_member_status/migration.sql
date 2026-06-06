ALTER TABLE `project_members` ADD COLUMN `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

-- Safely add start_date if it was missed due to migration resolution bypass
-- Using a stored procedure to avoid errors if the column already exists
DELIMITER $$
CREATE PROCEDURE AddColumnsSafely()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tasks' 
        AND COLUMN_NAME = 'start_date'
    ) THEN
        ALTER TABLE `tasks` ADD COLUMN `start_date` DATE NULL;
    END IF;
    
    -- Ensure due_date is DATE instead of DATETIME
    ALTER TABLE `tasks` MODIFY `due_date` DATE NULL;
END$$
DELIMITER ;

CALL AddColumnsSafely();
DROP PROCEDURE AddColumnsSafely;

