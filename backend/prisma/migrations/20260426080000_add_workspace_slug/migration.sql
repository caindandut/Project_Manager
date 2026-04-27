-- Migration: add_workspace_slug
-- Add slug column to workspaces table with unique constraint

-- Step 1: Add slug column as nullable initially
ALTER TABLE `workspaces` ADD COLUMN `slug` VARCHAR(50) DEFAULT NULL;

-- Step 2: Generate slug from workspace name for existing records
UPDATE `workspaces`
SET `slug` = LOWER(
    REPLACE(
        REPLACE(
            REGEXP_REPLACE(`name`, '[^a-zA-Z0-9 ]', ''),
            ' ',
            '-'
        ),
        '--',
        '-'
    )
)
WHERE `slug` IS NULL;

-- Step 3: Update any remaining NULL slugs with a unique value
UPDATE `workspaces`
SET `slug` = CONCAT(`slug`, '-', `id`)
WHERE `slug` IS NULL OR `slug` = '';

-- Step 4: Make slug required (drop default, add NOT NULL)
ALTER TABLE `workspaces` MODIFY `slug` VARCHAR(50) NOT NULL;

-- Step 5: Add unique constraint
ALTER TABLE `workspaces` ADD UNIQUE INDEX `UQ_workspace_slug` (`slug`);

-- Step 6: Add index for slug lookup
CREATE INDEX `idx_workspace_slug` ON `workspaces` (`slug`);
