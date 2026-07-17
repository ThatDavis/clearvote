import { prisma } from '../src/lib/prisma'

async function makeAdmin(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  })

  console.log(`Promoted ${user.email} to system admin.`)
  await prisma.$disconnect()
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: pnpm tsx scripts/make-admin.ts <email>')
  process.exit(1)
}

makeAdmin(email)
