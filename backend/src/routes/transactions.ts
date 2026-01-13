import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string(), // ISO date string
  categoryId: z.string(),
  notes: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  isAutomatic: z.boolean().optional(),
})

// List transactions with filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type, categoryId, page = '1', limit = '50' } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      }
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate as string),
      }
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate as string),
      }
    }

    if (type) {
      where.type = type
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ])

    res.json(transactions)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
      },
    })

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    res.json(transaction)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch transaction' })
  }
})

// Create transaction
router.post('/', async (req, res) => {
  try {
    const data = transactionSchema.parse(req.body)

    // Verify category exists and matches type
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })

    if (!category) {
      return res.status(400).json({ error: 'Category not found' })
    }

    if (category.type !== data.type) {
      return res.status(400).json({
        error: `Category type mismatch. Category is ${category.type}, transaction is ${data.type}`,
      })
    }

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
      include: {
        category: true,
      },
    })

    res.status(201).json(transaction)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create transaction' })
  }
})

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = transactionSchema.partial().parse(req.body)

    // Check if transaction exists
    const existing = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    // Don't allow editing automatic transactions (from appointments)
    if (existing.isAutomatic) {
      return res.status(400).json({
        error: 'Cannot edit automatic transactions. Edit the original appointment instead.',
      })
    }

    // If changing category, verify it exists and matches type
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      })

      if (!category) {
        return res.status(400).json({ error: 'Category not found' })
      }

      const transactionType = data.type || existing.type
      if (category.type !== transactionType) {
        return res.status(400).json({
          error: `Category type mismatch. Category is ${category.type}, transaction is ${transactionType}`,
        })
      }
    }

    const updateData: any = { ...data }
    if (data.date) {
      updateData.date = new Date(data.date)
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    })

    res.json(transaction)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to update transaction' })
  }
})

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Check if transaction exists
    const existing = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    // Don't allow deleting automatic transactions
    if (existing.isAutomatic) {
      return res.status(400).json({
        error: 'Cannot delete automatic transactions. They are managed by appointments.',
      })
    }

    await prisma.transaction.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete transaction' })
  }
})

// Bulk create transactions (useful for importing)
router.post('/bulk', async (req, res) => {
  try {
    const { transactions } = req.body

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'transactions must be an array' })
    }

    const created = []
    const errors = []

    for (let i = 0; i < transactions.length; i++) {
      try {
        const data = transactionSchema.parse(transactions[i])
        const transaction = await prisma.transaction.create({
          data: {
            ...data,
            date: new Date(data.date),
          },
          include: {
            category: true,
          },
        })
        created.push(transaction)
      } catch (err) {
        errors.push({ index: i, error: err })
      }
    }

    res.status(201).json({
      created: created.length,
      errors: errors.length,
      transactions: created,
      errorDetails: errors,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to bulk create transactions' })
  }
})

export default router
