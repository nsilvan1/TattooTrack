import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const clients = [
  {
    name: 'Lucas Mendes',
    phone: '11987654321',
    email: 'lucas.mendes@email.com',
    instagram: '@lucasmendes_ink',
    birthDate: new Date('1995-03-15'),
    city: 'São Paulo',
    notes: 'Cliente interessado em tattoo realista no braço direito. Primeira tattoo.',
    tags: ['Orçamento'],
  },
  {
    name: 'Mariana Costa',
    phone: '11976543210',
    email: 'mari.costa@gmail.com',
    instagram: '@maricosta',
    birthDate: new Date('1992-08-22'),
    city: 'São Paulo',
    address: 'Rua Augusta, 1500',
    allergies: 'Alergia a látex',
    notes: 'Quer fazer uma mandala nas costas. Sessão marcada para sexta.',
    tags: ['Agendado'],
  },
  {
    name: 'Rafael Santos',
    phone: '11965432109',
    email: 'rafa.santos@hotmail.com',
    instagram: '@rafatattoo',
    birthDate: new Date('1988-12-01'),
    city: 'Guarulhos',
    medicalNotes: 'Diabético tipo 2 - cicatrização mais lenta',
    notes: 'Projeto de fechamento de braço em andamento. 3ª sessão.',
    tags: ['Em Andamento', 'VIP'],
  },
  {
    name: 'Juliana Oliveira',
    phone: '11954321098',
    instagram: '@ju_oliver',
    birthDate: new Date('1998-05-10'),
    city: 'São Paulo',
    notes: 'Finalizou tattoo de borboleta no tornozelo. Cliente satisfeita!',
    tags: ['Finalizado'],
  },
  {
    name: 'Pedro Almeida',
    phone: '11943210987',
    email: 'pedro.almeida@empresa.com',
    instagram: '@pedroalmeida',
    birthDate: new Date('1990-07-28'),
    city: 'Osasco',
    address: 'Av. dos Autonomistas, 800',
    notes: 'Precisa de retoque na tattoo do leão. Algumas falhas na linha.',
    tags: ['Retorno'],
  },
  {
    name: 'Camila Ferreira',
    phone: '11932109876',
    email: 'camila.f@gmail.com',
    instagram: '@camilafer',
    birthDate: new Date('1994-11-03'),
    city: 'São Paulo',
    allergies: 'Sensibilidade a tintas vermelhas',
    medicalNotes: 'Pele sensível, usar produtos hipoalergênicos',
    notes: 'Cliente VIP - já fez 5 tattoos conosco. Interessada em sleeve japonês.',
    tags: ['VIP', 'Orçamento'],
  },
  {
    name: 'Bruno Nascimento',
    phone: '11921098765',
    instagram: '@brunonascimento',
    birthDate: new Date('1987-02-14'),
    city: 'Santo André',
    notes: 'Orçamento para tattoo geométrica no antebraço.',
    tags: ['Orçamento'],
  },
  {
    name: 'Amanda Lima',
    phone: '11910987654',
    email: 'amanda.lima@outlook.com',
    instagram: '@amandalima_',
    birthDate: new Date('1996-09-20'),
    city: 'São Paulo',
    address: 'Rua Oscar Freire, 200',
    notes: 'Sessão de blackwork em andamento. Falta 40% para finalizar.',
    tags: ['Em Andamento'],
  },
  {
    name: 'Thiago Barbosa',
    phone: '11909876543',
    email: 'thiago.barbosa@gmail.com',
    instagram: '@thiagobarbosa',
    birthDate: new Date('1985-04-07'),
    city: 'Campinas',
    notes: 'Finalizou projeto de half-sleeve tribal. Excelente cicatrização.',
    tags: ['Finalizado', 'VIP'],
  },
  {
    name: 'Fernanda Souza',
    phone: '11898765432',
    instagram: '@fersouza',
    birthDate: new Date('2000-01-25'),
    city: 'São Paulo',
    notes: 'Primeira consulta - quer fazer frase em lettering na costela.',
    tags: ['Orçamento'],
  },
]

async function main() {
  console.log('Criando clientes fictícios...\n')

  // Get all tags
  const allTags = await prisma.tag.findMany()
  const tagMap = new Map(allTags.map(t => [t.name, t.id]))

  for (const clientData of clients) {
    const { tags, ...data } = clientData

    const client = await prisma.client.create({
      data: {
        ...data,
        tags: {
          create: tags.map(tagName => ({
            tag: { connect: { id: tagMap.get(tagName) } }
          }))
        }
      },
      include: {
        tags: { include: { tag: true } }
      }
    })

    const tagNames = client.tags.map(t => t.tag.name).join(', ')
    console.log(`✓ ${client.name} - [${tagNames}]`)
  }

  console.log('\n✅ 10 clientes criados com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
