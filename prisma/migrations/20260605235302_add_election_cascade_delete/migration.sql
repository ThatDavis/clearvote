-- DropForeignKey
ALTER TABLE "Poll" DROP CONSTRAINT "Poll_electionId_fkey";

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
