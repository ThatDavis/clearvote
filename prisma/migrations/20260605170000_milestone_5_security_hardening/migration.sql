-- Milestone 5: Election Security & Audit Hardening
-- Schema changes: ballot secrecy, token hashing, audit logs, proxy removal

-- 1. Add email verification to User
ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);

-- 2. Remove ballot->voter identity link
ALTER TABLE "Ballot" DROP CONSTRAINT "Ballot_userId_fkey";
ALTER TABLE "Ballot" DROP COLUMN "userId";
ALTER TABLE "Ballot" DROP COLUMN "voterToken";
DROP INDEX "Ballot_pollId_voterToken_key";

-- 3. Add vote tracking to VoterRoll
ALTER TABLE "VoterRoll" ADD COLUMN "hasVoted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoterRoll" ADD COLUMN "votedAt" TIMESTAMP(3);

-- 4. Hash tokens instead of storing plaintext
ALTER TABLE "VoterToken" RENAME COLUMN "token" TO "tokenHash";
DROP INDEX "VoterToken_pollId_token_key";
CREATE UNIQUE INDEX "VoterToken_pollId_tokenHash_key" ON "VoterToken"("pollId", "tokenHash");

-- 5. Remove Proxy table entirely
ALTER TABLE "Proxy" DROP CONSTRAINT "Proxy_proxyId_fkey";
ALTER TABLE "Proxy" DROP CONSTRAINT "Proxy_principalId_fkey";
ALTER TABLE "Proxy" DROP CONSTRAINT "Proxy_pollId_fkey";
DROP INDEX "Proxy_pollId_principalId_key";
DROP INDEX "Proxy_pollId_idx";
DROP TABLE "Proxy";
