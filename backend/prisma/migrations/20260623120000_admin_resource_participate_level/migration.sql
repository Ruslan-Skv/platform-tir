-- Миграция VIEW → PARTICIPATE: сохраняем прежнее поведение (социальные действия при «просмотре»).
UPDATE "admin_resource_permissions" SET "permission" = 'PARTICIPATE' WHERE "permission" = 'VIEW';
UPDATE "admin_resource_role_permissions" SET "permission" = 'PARTICIPATE' WHERE "permission" = 'VIEW';
