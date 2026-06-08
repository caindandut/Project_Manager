ALTER TABLE `tasks`
ADD COLUMN `created_by_id` INTEGER NULL;

UPDATE `tasks` t
INNER JOIN (
    SELECT `entity_id`, MIN(`id`) AS `activity_id`
    FROM `activity_logs`
    WHERE `action` = 'CREATE'
      AND `entity_type` = 'TASK'
    GROUP BY `entity_id`
) first_create
    ON first_create.`entity_id` = t.`id`
INNER JOIN `activity_logs` al
    ON al.`id` = first_create.`activity_id`
SET t.`created_by_id` = al.`user_id`
WHERE t.`created_by_id` IS NULL;

CREATE INDEX `idx_task_creator` ON `tasks`(`created_by_id`);

ALTER TABLE `tasks`
ADD CONSTRAINT `tasks_created_by_id_fkey`
FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
