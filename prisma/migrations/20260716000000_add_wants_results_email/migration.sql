-- AlterTable
ALTER TABLE "ElectionVoterRoll" ADD COLUMN "wantsResultsEmail" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VoterRoll" ADD COLUMN "wantsResultsEmail" BOOLEAN NOT NULL DEFAULT false;
