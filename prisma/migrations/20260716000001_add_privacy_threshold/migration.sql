-- AlterTable
ALTER TABLE "Contest" ADD COLUMN "privacyThreshold" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN "privacyThreshold" INTEGER NOT NULL DEFAULT 10;
