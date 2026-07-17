-- Alter the foreign key on VoterRoll to cascade on user delete
ALTER TABLE "VoterRoll" DROP CONSTRAINT "VoterRoll_userId_fkey";
ALTER TABLE "VoterRoll" ADD CONSTRAINT "VoterRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Alter the foreign key on ElectionVoterRoll to cascade on user delete
ALTER TABLE "ElectionVoterRoll" DROP CONSTRAINT "ElectionVoterRoll_userId_fkey";
ALTER TABLE "ElectionVoterRoll" ADD CONSTRAINT "ElectionVoterRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
