-- Add OrganizationInvite table for email-based org invitations

CREATE TABLE IF NOT EXISTS "OrganizationInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvite_tokenHash_key" ON "OrganizationInvite"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvite_email_organizationId_key" ON "OrganizationInvite"("email", "organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_organizationId_idx" ON "OrganizationInvite"("organizationId");

ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
