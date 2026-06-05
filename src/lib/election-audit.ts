import type { PrismaClient } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export async function electionAuditLog({
  electionId,
  action,
  detail,
  tx,
}: {
  electionId: string
  action: string
  detail?: string
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
}) {
  const client = tx ?? prisma
  await client.electionAuditLog.create({
    data: {
      electionId,
      action,
      detail: detail ?? null,
    },
  })
}
