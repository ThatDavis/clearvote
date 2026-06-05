import type { PrismaClient } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export type AuditAction =
  | 'tokens_generated'
  | 'poll_opened'
  | 'poll_closed'
  | 'voter_added'
  | 'voter_removed'
  | 'ballot_cast'
  | 'results_viewed'

export async function auditLog({
  pollId,
  action,
  detail,
  tx,
}: {
  pollId: string
  action: AuditAction
  detail?: string
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
}): Promise<void> {
  const client = tx ?? prisma
  await client.auditLog.create({
    data: {
      pollId,
      action,
      detail: detail ?? null,
    },
  })
}
