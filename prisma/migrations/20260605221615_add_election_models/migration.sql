-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "contestOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "electionId" TEXT;

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "creatorId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionVoterToken" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ballotStyleId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionVoterToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionVoterRoll" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ballotStyleId" TEXT,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "votedAt" TIMESTAMP(3),

    CONSTRAINT "ElectionVoterRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionReceipt" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionAuditLog" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Election_slug_key" ON "Election"("slug");

-- CreateIndex
CREATE INDEX "ElectionVoterToken_electionId_idx" ON "ElectionVoterToken"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionVoterToken_electionId_tokenHash_key" ON "ElectionVoterToken"("electionId", "tokenHash");

-- CreateIndex
CREATE INDEX "ElectionVoterRoll_electionId_idx" ON "ElectionVoterRoll"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionVoterRoll_electionId_userId_key" ON "ElectionVoterRoll"("electionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionReceipt_receiptCode_key" ON "ElectionReceipt"("receiptCode");

-- CreateIndex
CREATE INDEX "ElectionReceipt_electionId_idx" ON "ElectionReceipt"("electionId");

-- CreateIndex
CREATE INDEX "ElectionAuditLog_electionId_idx" ON "ElectionAuditLog"("electionId");

-- CreateIndex
CREATE INDEX "Poll_electionId_idx" ON "Poll"("electionId");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionVoterToken" ADD CONSTRAINT "ElectionVoterToken_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionVoterRoll" ADD CONSTRAINT "ElectionVoterRoll_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionVoterRoll" ADD CONSTRAINT "ElectionVoterRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionReceipt" ADD CONSTRAINT "ElectionReceipt_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionAuditLog" ADD CONSTRAINT "ElectionAuditLog_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
