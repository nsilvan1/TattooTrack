import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'

const router = Router()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'tattootrack_secret_key'

// Middleware de autenticação
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    ;(req as any).userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// Aplicar middleware em todas as rotas
router.use(authMiddleware)

// Configurar multer para upload de screenshots
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/reports')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens são permitidas'))
    }
  }
})

// ==================== SCHEMAS ====================

const createReportSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  type: z.enum(['bug', 'feature', 'other']).default('bug'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  pageUrl: z.string().optional(),
  userAgent: z.string().optional(),
})

const updateReportSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

const createResponseSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória'),
})

// ==================== REPORTS ====================

// Upload screenshots para report
router.post('/upload', upload.array('screenshots', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    const urls = files.map(file => `/uploads/reports/${file.filename}`)
    res.json({ urls })
  } catch (error) {
    console.error('Error uploading screenshots:', error)
    res.status(500).json({ error: 'Erro ao fazer upload das imagens' })
  }
})

// Create new report
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    const data = createReportSchema.parse(req.body)
    const screenshots = req.body.screenshots || []

    const report = await prisma.report.create({
      data: {
        ...data,
        userId,
        screenshots,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true }
        },
        responses: {
          include: {
            user: {
              select: { id: true, name: true, isAdmin: true }
            }
          }
        }
      }
    })

    res.status(201).json(report)
  } catch (error) {
    console.error('Error creating report:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Erro ao criar report' })
  }
})

// List reports (user sees their own, admin sees all)
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).userId
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    })

    const { status, type, priority } = req.query

    const where: any = {}

    // Non-admin users only see their own reports
    if (!user?.isAdmin) {
      where.userId = userId
    }

    if (status) where.status = status as string
    if (type) where.type = type as string
    if (priority) where.priority = priority as string

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, username: true }
        },
        _count: {
          select: { responses: true }
        }
      }
    })

    res.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({ error: 'Erro ao buscar reports' })
  }
})

// Get single report with responses
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    })

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, username: true, email: true }
        },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, isAdmin: true }
            }
          }
        }
      }
    })

    if (!report) {
      return res.status(404).json({ error: 'Report não encontrado' })
    }

    // Check permission
    if (!user?.isAdmin && report.userId !== userId) {
      return res.status(403).json({ error: 'Sem permissão para ver este report' })
    }

    res.json(report)
  } catch (error) {
    console.error('Error fetching report:', error)
    res.status(500).json({ error: 'Erro ao buscar report' })
  }
})

// Update report status/priority (admin only)
router.patch('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Apenas admins podem atualizar reports' })
    }

    const data = updateReportSchema.parse(req.body)

    const report = await prisma.report.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, username: true }
        },
        responses: {
          include: {
            user: {
              select: { id: true, name: true, isAdmin: true }
            }
          }
        }
      }
    })

    res.json(report)
  } catch (error) {
    console.error('Error updating report:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Erro ao atualizar report' })
  }
})

// Add response to report
router.post('/:id/responses', async (req, res) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    })

    const report = await prisma.report.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!report) {
      return res.status(404).json({ error: 'Report não encontrado' })
    }

    // Check permission
    if (!user?.isAdmin && report.userId !== userId) {
      return res.status(403).json({ error: 'Sem permissão para responder este report' })
    }

    const data = createResponseSchema.parse(req.body)

    const response = await prisma.reportResponse.create({
      data: {
        ...data,
        reportId: id,
        userId,
        isAdmin: user?.isAdmin || false,
      },
      include: {
        user: {
          select: { id: true, name: true, isAdmin: true }
        }
      }
    })

    res.status(201).json(response)
  } catch (error) {
    console.error('Error creating response:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Erro ao criar resposta' })
  }
})

// Get report stats (admin only)
router.get('/admin/stats', async (req, res) => {
  try {
    const userId = (req as any).userId

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Apenas admins podem ver estatísticas' })
    }

    const [total, open, inProgress, resolved, closed, byType, byPriority] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'open' } }),
      prisma.report.count({ where: { status: 'in_progress' } }),
      prisma.report.count({ where: { status: 'resolved' } }),
      prisma.report.count({ where: { status: 'closed' } }),
      prisma.report.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.report.groupBy({
        by: ['priority'],
        _count: true,
      }),
    ])

    res.json({
      total,
      byStatus: { open, inProgress, resolved, closed },
      byType: byType.reduce((acc, item) => ({ ...acc, [item.type]: item._count }), {}),
      byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item.priority]: item._count }), {}),
    })
  } catch (error) {
    console.error('Error fetching report stats:', error)
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

export default router
