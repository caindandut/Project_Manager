UPDATE `workspace_members`
SET `role` = 'ADMIN'
WHERE `role` = 'OWNER'
  AND `deleted_at` IS NULL;
