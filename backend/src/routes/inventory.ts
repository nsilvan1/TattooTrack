import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

// ==================== SCHEMAS ====================

const productCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().optional(),
})

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  brand: z.string().optional(),
  purchaseUnit: z.string().default('un'),       // Unidade de compra: cx, pct, fr, un
  usageUnit: z.string().default('un'),          // Unidade de uso: un, ml, g
  quantityPerPurchaseUnit: z.number().default(1), // Ex: 50 agulhas por caixa
  currentStock: z.number().default(0),          // Float para permitir frações
  minStock: z.number().default(5),              // Float para permitir frações
  costPrice: z.number().optional(),             // Preço por purchaseUnit
  supplier: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

const stockMovementSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().min(0.01, 'Quantidade deve ser maior que 0'),
  unit: z.string().min(1, 'Unidade é obrigatória'), // Pode ser purchaseUnit ou usageUnit
  reason: z.string().optional(),
  notes: z.string().optional(),
  costPerUnit: z.number().optional(),
  appointmentId: z.string().optional(), // Vínculo opcional com agendamento
})

const batchStockMovementSchema = z.object({
  appointmentId: z.string().min(1, 'ID do agendamento é obrigatório'),
  movements: z.array(z.object({
    productId: z.string().min(1, 'Produto é obrigatório'),
    quantity: z.number().min(0.01, 'Quantidade deve ser maior que 0'),
    unit: z.string().min(1, 'Unidade é obrigatória'),
  })).min(1, 'Pelo menos uma movimentação é necessária'),
})

// ==================== PRODUCT CATEGORIES ====================

// List all product categories with product count
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    const categoriesWithCount = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      productCount: cat._count.products,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }))

    res.json(categoriesWithCount)
  } catch (error) {
    console.error('Error fetching product categories:', error)
    res.status(500).json({ error: 'Failed to fetch product categories' })
  }
})

// Create product category
router.post('/categories', async (req, res) => {
  try {
    const data = productCategorySchema.parse(req.body)

    const category = await prisma.productCategory.create({
      data,
    })

    res.status(201).json(category)
  } catch (error) {
    console.error('Error creating product category:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create product category' })
  }
})

// Update product category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = productCategorySchema.parse(req.body)

    const category = await prisma.productCategory.update({
      where: { id },
      data,
    })

    res.json(category)
  } catch (error) {
    console.error('Error updating product category:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to update product category' })
  }
})

// Delete product category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    })

    if (productsCount > 0) {
      return res.status(400).json({
        error: `Não é possível excluir. Existem ${productsCount} produto(s) nesta categoria.`
      })
    }

    await prisma.productCategory.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting product category:', error)
    res.status(500).json({ error: 'Failed to delete product category' })
  }
})

// ==================== PRODUCTS ====================

// List all products with optional filters
router.get('/products', async (req, res) => {
  try {
    const { search, categoryId, lowStock, isActive } = req.query

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { brand: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId as string
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: true,
      }
    })

    // Calculate low stock for each product
    let productsWithAlerts = products.map(product => ({
      ...product,
      isLowStock: product.currentStock <= product.minStock,
    }))

    // Filter low stock products if requested
    if (lowStock === 'true') {
      productsWithAlerts = productsWithAlerts.filter(p => p.isLowStock)
    }

    res.json(productsWithAlerts)
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// Get single product with movements history
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        }
      }
    })

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' })
    }

    res.json({
      ...product,
      isLowStock: product.currentStock <= product.minStock,
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

// Create product
router.post('/products', async (req, res) => {
  try {
    const data = productSchema.parse(req.body)

    const product = await prisma.product.create({
      data,
      include: {
        category: true,
      }
    })

    // If initial stock > 0, create an entry movement
    if (data.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'in',
          quantity: data.currentStock,
          unit: data.usageUnit,
          reason: 'Estoque inicial',
          costPerUnit: data.costPrice,
        }
      })
    }

    res.status(201).json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = productSchema.partial().parse(req.body)

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
      }
    })

    res.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.product.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

// ==================== STOCK MOVEMENTS ====================

// Create stock movement (in/out/adjustment)
router.post('/movements', async (req, res) => {
  try {
    const data = stockMovementSchema.parse(req.body)

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    })

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' })
    }

    // Convert quantity to usageUnit for stock calculation
    let quantityInUsageUnit = data.quantity

    // If the movement is in purchaseUnit, convert to usageUnit
    if (data.unit === product.purchaseUnit && product.purchaseUnit !== product.usageUnit) {
      quantityInUsageUnit = data.quantity * product.quantityPerPurchaseUnit
    }

    // Calculate new stock (always in usageUnit)
    let newStock = product.currentStock
    let movementQuantity = data.quantity // Keep original for record

    if (data.type === 'in') {
      newStock += quantityInUsageUnit
    } else if (data.type === 'out') {
      newStock -= quantityInUsageUnit
      if (newStock < 0) {
        return res.status(400).json({
          error: `Estoque insuficiente. Disponível: ${product.currentStock} ${product.usageUnit}`
        })
      }
    } else if (data.type === 'adjustment') {
      // For adjustment, the quantity is the new absolute value in usageUnit
      movementQuantity = data.quantity - product.currentStock
      newStock = data.quantity
    }

    // Create movement and update stock in a transaction
    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.type === 'adjustment' ? movementQuantity : data.quantity,
          unit: data.unit,
          reason: data.reason,
          notes: data.notes,
          costPerUnit: data.costPerUnit,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              usageUnit: true,
              purchaseUnit: true,
              quantityPerPurchaseUnit: true,
            }
          },
        }
      }),
      prisma.product.update({
        where: { id: data.productId },
        data: { currentStock: newStock }
      })
    ])

    res.status(201).json({
      ...movement,
      newStock,
      quantityInUsageUnit, // Return converted quantity for reference
    })
  } catch (error) {
    console.error('Error creating stock movement:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create stock movement' })
  }
})

// Get movements history with filters
router.get('/movements', async (req, res) => {
  try {
    const { productId, type, startDate, endDate, appointmentId, limit = '50' } = req.query

    const where: any = {}

    if (productId) {
      where.productId = productId as string
    }

    if (type) {
      where.type = type as string
    }

    if (appointmentId) {
      where.appointmentId = appointmentId as string
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string)
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            usageUnit: true,
            purchaseUnit: true,
            quantityPerPurchaseUnit: true,
          }
        },
        appointment: {
          select: {
            id: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    })

    res.json(movements)
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    res.status(500).json({ error: 'Failed to fetch stock movements' })
  }
})

// Batch stock out (multiple products at once, linked to appointment)
router.post('/movements/batch', async (req, res) => {
  try {
    const data = batchStockMovementSchema.parse(req.body)

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      select: { id: true, title: true, client: { select: { name: true } } }
    })

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    // Get all products involved
    const productIds = data.movements.map(m => m.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: 'Um ou mais produtos não foram encontrados' })
    }

    // Build product map for easy lookup
    const productMap = new Map(products.map(p => [p.id, p]))

    // Validate stock availability for all products first
    const stockErrors: string[] = []
    const movementsData: Array<{
      productId: string
      quantity: number
      quantityInUsageUnit: number
      unit: string
      newStock: number
    }> = []

    for (const movement of data.movements) {
      const product = productMap.get(movement.productId)!

      // Convert quantity to usageUnit
      let quantityInUsageUnit = movement.quantity
      if (movement.unit === product.purchaseUnit && product.purchaseUnit !== product.usageUnit) {
        quantityInUsageUnit = movement.quantity * product.quantityPerPurchaseUnit
      }

      const newStock = product.currentStock - quantityInUsageUnit

      if (newStock < 0) {
        stockErrors.push(
          `${product.name}: estoque insuficiente. Disponível: ${product.currentStock} ${product.usageUnit}, solicitado: ${quantityInUsageUnit} ${product.usageUnit}`
        )
      } else {
        movementsData.push({
          productId: movement.productId,
          quantity: movement.quantity,
          quantityInUsageUnit,
          unit: movement.unit,
          newStock,
        })
      }
    }

    if (stockErrors.length > 0) {
      return res.status(400).json({
        error: 'Estoque insuficiente para alguns produtos',
        details: stockErrors
      })
    }

    // Execute all movements in a transaction
    const transactionOps = movementsData.flatMap(m => [
      prisma.stockMovement.create({
        data: {
          productId: m.productId,
          type: 'out',
          quantity: m.quantity,
          unit: m.unit,
          reason: `Uso em sessão: ${appointment.title}`,
          appointmentId: data.appointmentId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              usageUnit: true,
              purchaseUnit: true,
              quantityPerPurchaseUnit: true,
            }
          }
        }
      }),
      prisma.product.update({
        where: { id: m.productId },
        data: { currentStock: m.newStock }
      })
    ])

    const results = await prisma.$transaction(transactionOps)

    // Filter only the movement records (every other result starting from 0)
    const createdMovements = results.filter((_, i) => i % 2 === 0)

    res.status(201).json({
      appointmentId: data.appointmentId,
      appointment: {
        id: appointment.id,
        title: appointment.title,
        clientName: appointment.client.name,
      },
      movements: createdMovements,
      summary: {
        totalItems: data.movements.length,
        productsAffected: products.map(p => ({
          id: p.id,
          name: p.name,
          previousStock: p.currentStock,
          newStock: movementsData.find(m => m.productId === p.id)?.newStock,
        }))
      }
    })
  } catch (error) {
    console.error('Error creating batch stock movements:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create batch stock movements' })
  }
})

// ==================== STATS ====================

// Get inventory stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      totalCategories,
      lowStockProducts,
      products
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.productCategory.count(),
      prisma.product.findMany({
        where: { isActive: true },
        select: { currentStock: true, minStock: true }
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { currentStock: true, costPrice: true, quantityPerPurchaseUnit: true }
      })
    ])

    // Count products with low stock
    const lowStockCount = lowStockProducts.filter(p => p.currentStock <= p.minStock).length

    // Calculate total inventory value (costPrice is per purchaseUnit, so divide currentStock by quantityPerPurchaseUnit)
    const totalValue = products.reduce((sum, p) => {
      const purchaseUnitsInStock = p.currentStock / (p.quantityPerPurchaseUnit || 1)
      return sum + (purchaseUnitsInStock * (p.costPrice || 0))
    }, 0)

    // Get recent movements
    const recentMovements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        product: {
          select: {
            name: true,
            usageUnit: true,
            purchaseUnit: true,
            quantityPerPurchaseUnit: true,
          }
        }
      }
    })

    // Get products with lowest stock (as percentage of minStock)
    const criticalStock = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { currentStock: 'asc' },
      take: 5,
      include: {
        category: true
      }
    })

    res.json({
      overview: {
        totalProducts,
        activeProducts,
        totalCategories,
        lowStockCount,
        totalValue,
      },
      recentMovements,
      criticalStock: criticalStock.map(p => ({
        ...p,
        isLowStock: p.currentStock <= p.minStock,
      })),
    })
  } catch (error) {
    console.error('Error fetching inventory stats:', error)
    res.status(500).json({ error: 'Failed to fetch inventory stats' })
  }
})

export default router
