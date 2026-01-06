import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

  // Criar usuário de teste
  const hashedPassword = await bcrypt.hash('123456', 10)

  const testUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      password: hashedPassword,
    },
  })

  console.log('Usuário de teste criado:')
  console.log('  Usuário: admin')
  console.log('  Senha: 123456')

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
