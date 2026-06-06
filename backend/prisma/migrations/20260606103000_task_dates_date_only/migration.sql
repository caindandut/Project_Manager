ALTER TABLE `tasks`
  ADD COLUMN `start_date` DATE NULL;

ALTER TABLE `tasks`
  MODIFY `due_date` DATE NULL;
