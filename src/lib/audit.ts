import type { PrismaClient } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export type AuditAction =
  | 'tokens_generated'
  | 'poll_opened'
  | 'poll_closed'
  | 'election_opened'
  | 'election_closed'
  | 'voter_added'
  | 'voter_removed'
  | 'ballot_cast'
  | 'results_viewed'

export async function audit({
  kind,
  entityId,
  action,
  detail,
  tx,
}: {
  kind: 'poll' | 'election'
  entityId: string
  action: AuditAction | string
  detail?: string
  tx?: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >
}): Promise<void> {
  const client = tx ?? prisma
  if (kind === 'poll') {
    await client.auditLog.create({
      data: {
        pollId: entityId,
        action,
        detail: detail ?? null,
      },
    })
  } else {
    await client.electionAuditLog.create({
      data: {
        electionId: entityId,
        action,
        detail: detail ?? null,
      },
    })
  }
}
