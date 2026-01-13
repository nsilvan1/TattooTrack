import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get financial summary (total income, expense, balance)
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

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

    // Get totals by type
    const [incomeResult, expenseResult, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: 'income' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where }),
    ])

    const totalIncome = incomeResult._sum.amount || 0
    const totalExpense = expenseResult._sum.amount || 0
    const balance = totalIncome - totalExpense

    res.json({
      totalIncome,
      totalExpense,
      balance,
      transactionCount,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch financial summary' })
  }
})

// Get breakdown by category
router.get('/by-category', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query

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

    // Group by category
    const transactions = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
    })

    // Get category details
    const categoryIds = transactions.map(t => t.categoryId)
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    })

    const categoryMap = new Map(categories.map(c => [c.id, c]))

    // Calculate total for percentage
    const total = transactions.reduce((sum, t) => sum + (t._sum.amount || 0), 0)

    // Build response with category details
    const result = transactions
      .map(t => ({
        category: categoryMap.get(t.categoryId),
        total: t._sum.amount || 0,
        count: t._count,
        percentage: total > 0 ? ((t._sum.amount || 0) / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    res.json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch category breakdown' })
  }
})

// Get monthly summary (for charts)
router.get('/monthly', async (req, res) => {
  try {
    const { year } = req.query
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear()

    const startDate = new Date(targetYear, 0, 1)
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        date: true,
      },
    })

    // Group by month
    const monthlyData: Record<number, { income: number; expense: number }> = {}

    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { income: 0, expense: 0 }
    }

    transactions.forEach(t => {
      const month = new Date(t.date).getMonth()
      if (t.type === 'income') {
        monthlyData[month].income += t.amount
      } else {
        monthlyData[month].expense += t.amount
      }
    })

    const result = Object.entries(monthlyData).map(([month, data]) => ({
      month: parseInt(month),
      monthName: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ][parseInt(month)],
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }))

    res.json({
      year: targetYear,
      data: result,
      totals: {
        income: result.reduce((sum, m) => sum + m.income, 0),
        expense: result.reduce((sum, m) => sum + m.expense, 0),
        balance: result.reduce((sum, m) => sum + m.balance, 0),
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch monthly summary' })
  }
})

// Get daily summary for a specific month
router.get('/daily/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params
    const targetYear = parseInt(year)
    const targetMonth = parseInt(month) - 1 // JavaScript months are 0-indexed

    const startDate = new Date(targetYear, targetMonth, 1)
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: { date: 'asc' },
    })

    // Group by day
    const dailyData: Record<string, { income: number; expense: number; transactions: any[] }> = {}

    transactions.forEach(t => {
      const day = new Date(t.date).toISOString().split('T')[0]
      if (!dailyData[day]) {
        dailyData[day] = { income: 0, expense: 0, transactions: [] }
      }
      if (t.type === 'income') {
        dailyData[day].income += t.amount
      } else {
        dailyData[day].expense += t.amount
      }
      dailyData[day].transactions.push(t)
    })

    res.json({
      year: targetYear,
      month: targetMonth + 1,
      data: dailyData,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch daily summary' })
  }
})

// Get comparison with previous period
router.get('/comparison', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const currentStart = new Date(startDate as string)
    const currentEnd = new Date(endDate as string)

    // Calculate previous period (same duration, immediately before)
    const duration = currentEnd.getTime() - currentStart.getTime()
    const previousStart = new Date(currentStart.getTime() - duration - 86400000) // -1 day for gap
    const previousEnd = new Date(currentStart.getTime() - 86400000)

    // Get current period totals
    const [currentIncome, currentExpense] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          date: { gte: currentStart, lte: currentEnd },
          type: 'income',
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          date: { gte: currentStart, lte: currentEnd },
          type: 'expense',
        },
        _sum: { amount: true },
      }),
    ])

    // Get previous period totals
    const [previousIncome, previousExpense] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          date: { gte: previousStart, lte: previousEnd },
          type: 'income',
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          date: { gte: previousStart, lte: previousEnd },
          type: 'expense',
        },
        _sum: { amount: true },
      }),
    ])

    const current = {
      income: currentIncome._sum.amount || 0,
      expense: currentExpense._sum.amount || 0,
      balance: (currentIncome._sum.amount || 0) - (currentExpense._sum.amount || 0),
    }

    const previous = {
      income: previousIncome._sum.amount || 0,
      expense: previousExpense._sum.amount || 0,
      balance: (previousIncome._sum.amount || 0) - (previousExpense._sum.amount || 0),
    }

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    res.json({
      current: {
        period: { startDate, endDate },
        ...current,
      },
      previous: {
        period: {
          startDate: previousStart.toISOString().split('T')[0],
          endDate: previousEnd.toISOString().split('T')[0],
        },
        ...previous,
      },
      changes: {
        income: calculateChange(current.income, previous.income),
        expense: calculateChange(current.expense, previous.expense),
        balance: calculateChange(current.balance, previous.balance),
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch comparison' })
  }
})

export default router
