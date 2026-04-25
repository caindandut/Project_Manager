-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `google_id` VARCHAR(255) NULL,
    MODIFY `password` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_google_id_key` ON `users`(`google_id`);

-- CreateIndex
CREATE INDEX `idx_user_google_id` ON `users`(`google_id`);
