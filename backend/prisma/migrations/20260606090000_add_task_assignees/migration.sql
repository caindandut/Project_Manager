CREATE TABLE `task_assignees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_task_assignee_task_user`(`task_id`, `user_id`),
    INDEX `idx_task_assignee_task`(`task_id`),
    INDEX `idx_task_assignee_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `task_assignees` (`task_id`, `user_id`, `assigned_at`)
SELECT `id`, `assignee_id`, COALESCE(`updated_at`, `created_at`, CURRENT_TIMESTAMP(3))
FROM `tasks`
WHERE `assignee_id` IS NOT NULL AND `deleted_at` IS NULL;

ALTER TABLE `task_assignees`
ADD CONSTRAINT `task_assignees_task_id_fkey`
FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `task_assignees`
ADD CONSTRAINT `task_assignees_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
