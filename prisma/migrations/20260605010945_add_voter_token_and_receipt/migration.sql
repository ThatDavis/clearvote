-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ballot" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "voterToken" TEXT NOT NULL,
    "rankings" JSONB NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "Ballot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterToken" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoterToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoterRoll" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "VoterRoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poll_slug_key" ON "Poll"("slug");

-- CreateIndex
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_receiptCode_key" ON "Ballot"("receiptCode");

-- CreateIndex
CREATE INDEX "Ballot_pollId_idx" ON "Ballot"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_pollId_voterToken_key" ON "Ballot"("pollId", "voterToken");

-- CreateIndex
CREATE INDEX "VoterToken_pollId_idx" ON "VoterToken"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "VoterToken_pollId_token_key" ON "VoterToken"("pollId", "token");

-- CreateIndex
CREATE INDEX "VoterRoll_pollId_idx" ON "VoterRoll"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "VoterRoll_pollId_email_key" ON "VoterRoll"("pollId", "email");

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterToken" ADD CONSTRAINT "VoterToken_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoterRoll" ADD CONSTRAINT "VoterRoll_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
