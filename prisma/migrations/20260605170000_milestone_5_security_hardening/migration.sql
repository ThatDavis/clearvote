-- Milestone 5: Election Security & Audit Hardening
-- Schema changes: ballot secrecy, token hashing, audit logs, proxy removal

-- 1. Add email verification to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);

-- 2. Remove ballot->voter identity link
ALTER TABLE "Ballot" DROP CONSTRAINT IF EXISTS "Ballot_userId_fkey";
ALTER TABLE "Ballot" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Ballot" DROP COLUMN IF EXISTS "voterToken";
DROP INDEX IF EXISTS "Ballot_pollId_voterToken_key";

-- 3. Add vote tracking to VoterRoll
ALTER TABLE "VoterRoll" ADD COLUMN IF NOT EXISTS "hasVoted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoterRoll" ADD COLUMN IF NOT EXISTS "votedAt" TIMESTAMP(3);

-- 4. Hash tokens instead of storing plaintext
ALTER TABLE "VoterToken" RENAME COLUMN "token" TO "tokenHash";
DROP INDEX IF EXISTS "VoterToken_pollId_token_key";
CREATE UNIQUE INDEX IF NOT EXISTS "VoterToken_pollId_tokenHash_key" ON "VoterToken"("pollId", "tokenHash");

-- 5. Remove Proxy table entirely
ALTER TABLE "Proxy" DROP CONSTRAINT IF EXISTS "Proxy_proxyId_fkey";
ALTER TABLE "Proxy" DROP CONSTRAINT IF EXISTS "Proxy_principalId_fkey";
ALTER TABLE "Proxy" DROP CONSTRAINT IF EXISTS "Proxy_pollId_fkey";
DROP INDEX IF EXISTS "Proxy_pollId_principalId_key";
DROP INDEX IF EXISTS "Proxy_pollId_idx";
DROP TABLE IF EXISTS "Proxy";
