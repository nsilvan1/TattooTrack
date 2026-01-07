const fs = require('fs')
const path = require('path')

// Load .env file manually
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  })
}

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed de transações...')

  // Primeiro criar categorias se não existirem
  const defaultCategories = [
    { name: 'Sessao de Tatuagem', type: 'income', color: '#34d399', icon: 'Palette', isDefault: true },
    { name: 'Sinal/Deposito', type: 'income', color: '#38bdf8', icon: 'Wallet', isDefault: true },
    { name: 'Retoque', type: 'income', color: '#a78bfa', icon: 'RefreshCw', isDefault: true },
    { name: 'Outros', type: 'income', color: '#94a3b8', icon: 'MoreHorizontal', isDefault: true },
    { name: 'Materiais', type: 'expense', color: '#f87171', icon: 'Package', isDefault: true },
    { name: 'Tintas', type: 'expense', color: '#fb923c', icon: 'Droplet', isDefault: true },
    { name: 'Agulhas', type: 'expense', color: '#fbbf24', icon: 'Scissors', isDefault: true },
    { name: 'Aluguel', type: 'expense', color: '#8b5cf6', icon: 'Home', isDefault: true },
    { name: 'Equipamentos', type: 'expense', color: '#06b6d4', icon: 'Monitor', isDefault: true },
    { name: 'Marketing', type: 'expense', color: '#ec4899', icon: 'Megaphone', isDefault: true },
    { name: 'Outros', type: 'expense', color: '#94a3b8', icon: 'MoreHorizontal', isDefault: true },
  ]

  console.log('Criando categorias...')
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, type: cat.type }
    })
    if (!existing) {
      await prisma.category.create({ data: cat })
      console.log(`  Categoria criada: ${cat.name} (${cat.type})`)
    }
  }

  // Buscar categorias
  const categories = await prisma.category.findMany()
  console.log(`Total de categorias: ${categories.length}`)

  const getCategoryId = (name, type) => {
    const cat = categories.find(c => c.name === name && c.type === type)
    return cat?.id
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const testTransactions = [
    // Receitas do mes atual
    { type: 'income', amount: 800, description: 'Sessao tatuagem braço - Cliente João', date: new Date(currentYear, currentMonth, 5), categoryId: getCategoryId('Sessao de Tatuagem', 'income') },
    { type: 'income', amount: 1200, description: 'Sessao tatuagem costas - Cliente Maria', date: new Date(currentYear, currentMonth, 8), categoryId: getCategoryId('Sessao de Tatuagem', 'income') },
    { type: 'income', amount: 300, description: 'Sinal sessao agendada - Cliente Pedro', date: new Date(currentYear, currentMonth, 10), categoryId: getCategoryId('Sinal/Deposito', 'income') },
    { type: 'income', amount: 500, description: 'Sessao tatuagem perna - Cliente Ana', date: new Date(currentYear, currentMonth, 12), categoryId: getCategoryId('Sessao de Tatuagem', 'income') },
    { type: 'income', amount: 150, description: 'Retoque gratuito convertido - Cliente Lucas', date: new Date(currentYear, currentMonth, 15), categoryId: getCategoryId('Retoque', 'income') },
    { type: 'income', amount: 950, description: 'Sessao tatuagem ombro - Cliente Carla', date: new Date(currentYear, currentMonth, 18), categoryId: getCategoryId('Sessao de Tatuagem', 'income') },
    { type: 'income', amount: 400, description: 'Sinal sessao grande - Cliente Roberto', date: new Date(currentYear, currentMonth, 20), categoryId: getCategoryId('Sinal/Deposito', 'income') },
    // Despesas do mes atual
    { type: 'expense', amount: 350, description: 'Compra de tintas variadas', date: new Date(currentYear, currentMonth, 3), categoryId: getCategoryId('Tintas', 'expense') },
    { type: 'expense', amount: 180, description: 'Agulhas descartaveis - 50 unidades', date: new Date(currentYear, currentMonth, 7), categoryId: getCategoryId('Agulhas', 'expense') },
    { type: 'expense', amount: 1500, description: 'Aluguel estudio Janeiro', date: new Date(currentYear, currentMonth, 1), categoryId: getCategoryId('Aluguel', 'expense') },
    { type: 'expense', amount: 250, description: 'Luvas, papel toalha, plastico filme', date: new Date(currentYear, currentMonth, 10), categoryId: getCategoryId('Materiais', 'expense') },
    { type: 'expense', amount: 120, description: 'Anuncio Instagram', date: new Date(currentYear, currentMonth, 14), categoryId: getCategoryId('Marketing', 'expense') },
    { type: 'expense', amount: 89, description: 'Manutencao maquina', date: new Date(currentYear, currentMonth, 16), categoryId: getCategoryId('Equipamentos', 'expense') },
  ]

  console.log('\nCriando transações de teste...')
  let created = 0
  for (const t of testTransactions) {
    if (t.categoryId) {
      await prisma.transaction.create({
        data: {
          type: t.type,
          amount: t.amount,
          description: t.description,
          date: t.date,
          categoryId: t.categoryId,
          isAutomatic: false,
        }
      })
      console.log(`  ${t.type === 'income' ? '+' : '-'} R$ ${t.amount.toFixed(2)} - ${t.description}`)
      created++
    }
  }

  console.log(`\n✅ ${created} transações criadas com sucesso!`)

  // Calcular totais
  const totals = await prisma.transaction.groupBy({
    by: ['type'],
    _sum: { amount: true }
  })

  const income = totals.find(t => t.type === 'income')?._sum.amount || 0
  const expense = totals.find(t => t.type === 'expense')?._sum.amount || 0

  console.log(`\nResumo:`)
  console.log(`  Receitas: R$ ${income.toFixed(2)}`)
  console.log(`  Despesas: R$ ${expense.toFixed(2)}`)
  console.log(`  Saldo: R$ ${(income - expense).toFixed(2)}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
