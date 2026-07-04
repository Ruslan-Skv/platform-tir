-- CreateTable
CREATE TABLE "admin_dashboard_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "catalogActivityVisible" BOOLEAN NOT NULL DEFAULT false,
    "trainingDynamicsVisible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_dashboard_block_pkey" PRIMARY KEY ("id")
);

INSERT INTO "admin_dashboard_block" ("id", "catalogActivityVisible", "trainingDynamicsVisible", "updatedAt")
VALUES ('main', false, true, CURRENT_TIMESTAMP);
