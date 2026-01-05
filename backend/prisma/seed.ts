import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultTags = [
  { name: 'Orçamento', color: '#FCD34D' },
  { name: 'Agendado', color: '#60A5FA' },
  { name: 'Em Andamento', color: '#A78BFA' },
  { name: 'Finalizado', color: '#4ADE80' },
  { name: 'Retorno', color: '#FB923C' },
  { name: 'VIP', color: '#FBBF24' },
]

async function main() {
  console.log('Seeding database...')

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
    console.log(`Created tag: ${tag.name}`)
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
