import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().optional().nullable(),
})

// Default categories to seed
const defaultCategories = [
  // Income categories
  { name: 'Sessão de Tatuagem', type: 'income', color: '#34D399', icon: 'palette', isDefault: true },
  { name: 'Sinal/Depósito', type: 'income', color: '#60A5FA', icon: 'wallet', isDefault: true },
  { name: 'Retoque', type: 'income', color: '#A78BFA', icon: 'brush', isDefault: true },
  { name: 'Cover-up', type: 'income', color: '#F472B6', icon: 'layers', isDefault: true },
  { name: 'Piercing', type: 'income', color: '#FBBF24', icon: 'circle', isDefault: true },
  { name: 'Outros (Receita)', type: 'income', color: '#94A3B8', icon: 'plus', isDefault: true },

  // Expense categories
  { name: 'Material/Insumos', type: 'expense', color: '#F87171', icon: 'package', isDefault: true },
  { name: 'Equipamentos', type: 'expense', color: '#FB923C', icon: 'tool', isDefault: true },
  { name: 'Aluguel', type: 'expense', color: '#A78BFA', icon: 'home', isDefault: true },
  { name: 'Energia/Água', type: 'expense', color: '#38BDF8', icon: 'zap', isDefault: true },
  { name: 'Marketing', type: 'expense', color: '#E879F9', icon: 'megaphone', isDefault: true },
  { name: 'Transporte', type: 'expense', color: '#4ADE80', icon: 'car', isDefault: true },
  { name: 'Alimentação', type: 'expense', color: '#FBBF24', icon: 'utensils', isDefault: true },
  { name: 'Manutenção', type: 'expense', color: '#94A3B8', icon: 'wrench', isDefault: true },
  { name: 'Outros (Despesa)', type: 'expense', color: '#64748B', icon: 'minus', isDefault: true },
]

// List all categories
router.get('/', async (req, res) => {
  try {
    const { type } = req.query

    const where: any = {
      userId: req.userId,
    }
    if (type) {
      where.type = type
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })

    res.json(categories)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    res.json(category)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch category' })
  }
})

// Create category
router.post('/', async (req, res) => {
  try {
    const data = categorySchema.parse(req.body)

    const category = await prisma.category.create({
      data: {
        ...data,
        isDefault: false,
        userId: req.userId!,
      },
    })

    res.status(201).json(category)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create category' })
  }
})

// Seed default categories
router.post('/seed', async (req, res) => {
  try {
    let created = 0
    const categories = []

    for (const cat of defaultCategories) {
      const existing = await prisma.category.findFirst({
        where: {
          name: cat.name,
          type: cat.type,
          userId: req.userId,
        },
      })

      if (!existing) {
        const newCat = await prisma.category.create({
          data: {
            ...cat,
            userId: req.userId!,
          },
        })
        categories.push(newCat)
        created++
      } else {
        categories.push(existing)
      }
    }

    res.json({
      message: `${created} categories created`,
      created,
      categories,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to seed categories' })
  }
})

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = categorySchema.partial().parse(req.body)

    // Verify ownership before updating
    const existing = await prisma.category.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' })
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    })

    res.json(category)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to update category' })
  }
})

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Verify ownership before deleting
    const existing = await prisma.category.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Check if category has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        categoryId: id,
        userId: req.userId,
      },
    })

    if (transactionCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with existing transactions',
        transactionCount,
      })
    }

    await prisma.category.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

export default router
