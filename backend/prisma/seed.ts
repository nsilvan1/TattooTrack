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

const testClients = [
  {
    name: 'Lucas Silva',
    phone: '(11) 99999-1234',
    email: 'lucas.silva@email.com',
    instagram: 'lucas_tattoo',
    birthDate: new Date('1995-03-15'),
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    allergies: 'Nenhuma conhecida',
    medicalNotes: '',
    notes: 'Cliente recorrente, prefere sessões no período da tarde',
  },
  {
    name: 'Marina Costa',
    phone: '(11) 98888-5678',
    email: 'marina.costa@email.com',
    instagram: 'mari_ink',
    birthDate: new Date('1998-07-22'),
    address: 'Av. Paulista, 1000 - Apto 42',
    city: 'São Paulo',
    allergies: 'Alergia a látex',
    medicalNotes: 'Usar luvas de nitrilo',
    notes: 'Primeira tatuagem, está nervosa',
  },
  {
    name: 'Pedro Henrique',
    phone: '(11) 97777-9012',
    email: 'pedro.h@email.com',
    instagram: 'ph_art',
    birthDate: new Date('1990-11-08'),
    address: 'Rua Augusta, 500',
    city: 'São Paulo',
    allergies: '',
    medicalNotes: 'Diabético - cuidado com cicatrização',
    notes: 'Colecionador de tatuagens, tem mais de 20',
  },
  {
    name: 'Ana Beatriz',
    phone: '(11) 96666-3456',
    email: 'anabeatriz@email.com',
    instagram: 'ana_bea_tattoo',
    birthDate: new Date('2000-01-30'),
    address: 'Rua Oscar Freire, 200',
    city: 'São Paulo',
    allergies: '',
    medicalNotes: '',
    notes: 'Gosta de tatuagens minimalistas',
  },
  {
    name: 'Rafael Oliveira',
    phone: '(11) 95555-7890',
    email: 'rafael.oliveira@email.com',
    instagram: 'rafa_ink',
    birthDate: new Date('1988-05-12'),
    address: 'Rua Consolação, 800',
    city: 'São Paulo',
    allergies: 'Alergia a certos pigmentos vermelhos',
    medicalNotes: 'Testar pigmento antes de aplicar',
    notes: 'Prefere estilo realista',
  },
  {
    name: 'Juliana Santos',
    phone: '(11) 94444-1234',
    email: 'ju.santos@email.com',
    instagram: 'ju_tattoos',
    birthDate: new Date('1993-09-25'),
    address: 'Alameda Santos, 150',
    city: 'São Paulo',
    allergies: '',
    medicalNotes: '',
    notes: 'Cliente VIP - sempre indica novos clientes',
  },
  {
    name: 'Bruno Ferreira',
    phone: '(11) 93333-5678',
    email: 'bruno.f@email.com',
    instagram: 'bruno_tatt',
    birthDate: new Date('1985-12-03'),
    address: 'Rua Haddock Lobo, 300',
    city: 'São Paulo',
    allergies: '',
    medicalNotes: 'Tem pressão baixa - pode desmaiar',
    notes: 'Fazer pausas frequentes durante a sessão',
  },
  {
    name: 'Camila Rodrigues',
    phone: '(11) 92222-9012',
    email: 'camila.rod@email.com',
    instagram: 'cami_ink',
    birthDate: new Date('1997-06-18'),
    address: 'Rua Bela Cintra, 450',
    city: 'São Paulo',
    allergies: '',
    medicalNotes: '',
    notes: 'Quer cobrir uma tatuagem antiga no braço',
  },
]

const testAppointments = [
  {
    title: 'Leão realista no braço',
    description: 'Tatuagem de leão em estilo realista, braço direito',
    startTime: '14:00',
    estimatedHours: 4,
    status: 'scheduled',
    price: 800,
    depositAmount: 200,
    depositPaid: true,
    notes: 'Cliente quer detalhes na juba',
  },
  {
    title: 'Mandala na costela',
    description: 'Mandala delicada na lateral da costela',
    startTime: '10:00',
    estimatedHours: 3,
    status: 'confirmed',
    price: 600,
    depositAmount: 150,
    depositPaid: true,
    notes: 'Região sensível, aplicar anestésico',
  },
  {
    title: 'Frase no pulso',
    description: 'Frase "Carpe Diem" em letra cursiva',
    startTime: '16:00',
    estimatedHours: 1,
    status: 'scheduled',
    price: 200,
    depositAmount: 50,
    depositPaid: false,
    notes: '',
  },
  {
    title: 'Retoque dragão',
    description: 'Retoque no dragão das costas',
    startTime: '11:00',
    estimatedHours: 2,
    status: 'scheduled',
    price: 300,
    depositAmount: 0,
    depositPaid: false,
    notes: 'Retoque gratuito - garantia',
  },
  {
    title: 'Borboleta colorida',
    description: 'Borboleta com cores vibrantes na panturrilha',
    startTime: '09:00',
    estimatedHours: 3,
    status: 'confirmed',
    price: 550,
    depositAmount: 150,
    depositPaid: true,
    notes: 'Trazer referências de cores',
  },
]

async function main() {
  console.log('Seeding database...')

  // Criar tags
  const createdTags: Record<string, string> = {}
  for (const tag of defaultTags) {
    const created = await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
    createdTags[tag.name] = created.id
    console.log(`Created tag: ${tag.name}`)
  }

  // Criar usuário de teste
  const hashedPassword = await bcrypt.hash('123456', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      password: hashedPassword,
    },
  })
  console.log('Usuário de teste criado: admin / 123456')

  // Criar clientes
  const createdClients: string[] = []
  for (const client of testClients) {
    const created = await prisma.client.create({
      data: client,
    })
    createdClients.push(created.id)
    console.log(`Created client: ${client.name}`)
  }

  // Adicionar tags aos clientes
  // Cliente 0 (Lucas) - VIP, Finalizado
  await prisma.clientTag.createMany({
    data: [
      { clientId: createdClients[0], tagId: createdTags['VIP'] },
      { clientId: createdClients[0], tagId: createdTags['Finalizado'] },
    ],
  })

  // Cliente 1 (Marina) - Agendado
  await prisma.clientTag.create({
    data: { clientId: createdClients[1], tagId: createdTags['Agendado'] },
  })

  // Cliente 2 (Pedro) - VIP, Em Andamento
  await prisma.clientTag.createMany({
    data: [
      { clientId: createdClients[2], tagId: createdTags['VIP'] },
      { clientId: createdClients[2], tagId: createdTags['Em Andamento'] },
    ],
  })

  // Cliente 3 (Ana) - Orçamento
  await prisma.clientTag.create({
    data: { clientId: createdClients[3], tagId: createdTags['Orçamento'] },
  })

  // Cliente 4 (Rafael) - Agendado
  await prisma.clientTag.create({
    data: { clientId: createdClients[4], tagId: createdTags['Agendado'] },
  })

  // Cliente 5 (Juliana) - VIP, Finalizado
  await prisma.clientTag.createMany({
    data: [
      { clientId: createdClients[5], tagId: createdTags['VIP'] },
      { clientId: createdClients[5], tagId: createdTags['Finalizado'] },
    ],
  })

  // Cliente 6 (Bruno) - Retorno
  await prisma.clientTag.create({
    data: { clientId: createdClients[6], tagId: createdTags['Retorno'] },
  })

  // Cliente 7 (Camila) - Orçamento
  await prisma.clientTag.create({
    data: { clientId: createdClients[7], tagId: createdTags['Orçamento'] },
  })

  console.log('Tags assigned to clients')

  // Criar agendamentos (próximos dias)
  const today = new Date()
  for (let i = 0; i < testAppointments.length; i++) {
    const appt = testAppointments[i]
    const appointmentDate = new Date(today)
    appointmentDate.setDate(today.getDate() + i + 1) // Próximos dias

    await prisma.appointment.create({
      data: {
        clientId: createdClients[i % createdClients.length],
        title: appt.title,
        description: appt.description,
        date: appointmentDate,
        startTime: appt.startTime,
        estimatedHours: appt.estimatedHours,
        status: appt.status,
        price: appt.price,
        depositAmount: appt.depositAmount,
        depositPaid: appt.depositPaid,
        depositPaidAt: appt.depositPaid ? new Date() : null,
        notes: appt.notes,
      },
    })
    console.log(`Created appointment: ${appt.title}`)
  }

  console.log('\n✅ Seeding completed!')
  console.log('\nDados criados:')
  console.log(`  - ${defaultTags.length} tags`)
  console.log(`  - ${testClients.length} clientes`)
  console.log(`  - ${testAppointments.length} agendamentos`)
  console.log('\nCredenciais:')
  console.log('  Usuário: admin')
  console.log('  Senha: 123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
