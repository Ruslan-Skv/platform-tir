-- AlterEnum: Replace UserRole enum with new hierarchy (SUPER_ADMIN, ADMIN, CONTENT_MANAGER, MODERATOR, SUPPORT, PARTNER, USER, GUEST).
-- Map existing MANAGER to MODERATOR.

-- Create new enum type
CREATE TYPE "UserRole_new" AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'PARTNER',
  'USER',
  'GUEST'
);

-- Update column: map MANAGER -> MODERATOR, other values must exist in new enum
ALTER TABLE "users" 
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "UserRole_new" 
    USING (
      CASE 
        WHEN "role"::text = 'MANAGER' THEN 'MODERATOR'::"UserRole_new"
        ELSE "role"::text::"UserRole_new"
      END
    );

-- Drop old enum and rename new
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Restore default for new users
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole";
