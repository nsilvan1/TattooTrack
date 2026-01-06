import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'tattootrack_secret_key'

// Helper para parsear body
function parseBody(req: VercelRequest) {
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
}

// Helper para verificar token
function verifyToken(req: VercelRequest): any | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { url, method } = req
  const path = url?.replace('/api', '') || '/'

  try {
    // ============ AUTH ============
    if (path === '/auth/login' && method === 'POST') {
      const { username, password } = parseBody(req)
      const user = await prisma.user.findUnique({ where: { username } })

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Usuário ou senha incorretos' })
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return res.json({
        token,
        user: { id: user.id, username: user.username, name: user.name, picture: user.picture, calendarConnected: user.calendarConnected }
      })
    }

    if (path === '/auth/register' && method === 'POST') {
      const { name, username, password } = parseBody(req)

      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing) {
        return res.status(400).json({ error: 'Username já existe' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({
        data: { name, username, password: hashedPassword }
      })

      const token = jwt.sign(
        { userId: user.id, username: user.username, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return res.json({
        token,
        user: { id: user.id, username: user.username, name: user.name, calendarConnected: user.calendarConnected }
      })
    }

    if (path === '/auth/me' && method === 'GET') {
      const decoded = verifyToken(req)
      if (!decoded) return res.status(401).json({ error: 'Token inválido' })

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, name: true, picture: true, calendarConnected: true }
      })

      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
      return res.json(user)
    }

    // ============ TAGS ============
    if (path === '/tags' && method === 'GET') {
      const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } })
      return res.json(tags)
    }

    if (path === '/tags' && method === 'POST') {
      const { name, color } = parseBody(req)
      const tag = await prisma.tag.create({ data: { name, color } })
      return res.json(tag)
    }

    // ============ CLIENTS ============
    if (path === '/clients' && method === 'GET') {
      const { page = '1', limit = '10', search, tagIds } = req.query as any
      const skip = (parseInt(page) - 1) * parseInt(limit)

      const where: any = {}
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }
      if (tagIds) {
        where.tags = { some: { tagId: { in: tagIds.split(',') } } }
      }

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: { tags: { include: { tag: true } } }
        }),
        prisma.client.count({ where })
      ])

      return res.json({ data: clients, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
    }

    if (path === '/clients' && method === 'POST') {
      const data = parseBody(req)
      const client = await prisma.client.create({ data })
      return res.json(client)
    }

    // Client by ID
    const clientMatch = path.match(/^\/clients\/([^/]+)$/)
    if (clientMatch) {
      const id = clientMatch[1]

      if (method === 'GET') {
        const client = await prisma.client.findUnique({
          where: { id },
          include: { tags: { include: { tag: true } }, references: true, appointments: true }
        })
        if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })
        return res.json(client)
      }

      if (method === 'PUT') {
        const data = parseBody(req)
        const client = await prisma.client.update({ where: { id }, data })
        return res.json(client)
      }

      if (method === 'DELETE') {
        await prisma.client.delete({ where: { id } })
        return res.status(204).end()
      }
    }

    // Client tags
    const clientTagMatch = path.match(/^\/clients\/([^/]+)\/tags$/)
    if (clientTagMatch && method === 'POST') {
      const clientId = clientTagMatch[1]
      const { tagId } = parseBody(req)
      await prisma.clientTag.create({ data: { clientId, tagId } })
      return res.status(201).end()
    }

    const clientTagDeleteMatch = path.match(/^\/clients\/([^/]+)\/tags\/([^/]+)$/)
    if (clientTagDeleteMatch && method === 'DELETE') {
      const [, clientId, tagId] = clientTagDeleteMatch
      await prisma.clientTag.delete({ where: { clientId_tagId: { clientId, tagId } } })
      return res.status(204).end()
    }

    // Client references
    const clientRefMatch = path.match(/^\/clients\/([^/]+)\/references$/)
    if (clientRefMatch && method === 'POST') {
      // Para upload de arquivos, seria necessário configurar diferente
      // Por enquanto, retorna erro
      return res.status(501).json({ error: 'Upload não suportado em serverless' })
    }

    // ============ APPOINTMENTS ============
    if (path === '/appointments' && method === 'GET') {
      const { startDate, endDate, status, clientId } = req.query as any
      const where: any = {}

      if (startDate) where.date = { gte: new Date(startDate) }
      if (endDate) where.date = { ...where.date, lte: new Date(endDate) }
      if (status) where.status = status
      if (clientId) where.clientId = clientId

      const appointments = await prisma.appointment.findMany({
        where,
        orderBy: { date: 'asc' },
        include: { client: true }
      })
      return res.json(appointments)
    }

    if (path === '/appointments' && method === 'POST') {
      const data = parseBody(req)
      const appointment = await prisma.appointment.create({
        data: { ...data, date: new Date(data.date) },
        include: { client: true }
      })
      return res.json(appointment)
    }

    // Appointments by month
    const calendarMatch = path.match(/^\/appointments\/calendar\/(\d+)\/(\d+)$/)
    if (calendarMatch && method === 'GET') {
      const [, year, month] = calendarMatch
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

      const appointments = await prisma.appointment.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' },
        include: { client: true }
      })
      return res.json(appointments)
    }

    // Appointment by ID
    const appointmentMatch = path.match(/^\/appointments\/([^/]+)$/)
    if (appointmentMatch) {
      const id = appointmentMatch[1]

      if (method === 'GET') {
        const appointment = await prisma.appointment.findUnique({
          where: { id },
          include: { client: true }
        })
        if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' })
        return res.json(appointment)
      }

      if (method === 'PUT') {
        const data = parseBody(req)
        if (data.date) data.date = new Date(data.date)
        const appointment = await prisma.appointment.update({
          where: { id },
          data,
          include: { client: true }
        })
        return res.json(appointment)
      }

      if (method === 'DELETE') {
        await prisma.appointment.delete({ where: { id } })
        return res.status(204).end()
      }
    }

    // Appointment status
    const statusMatch = path.match(/^\/appointments\/([^/]+)\/status$/)
    if (statusMatch && method === 'PATCH') {
      const id = statusMatch[1]
      const { status } = parseBody(req)
      const appointment = await prisma.appointment.update({
        where: { id },
        data: { status },
        include: { client: true }
      })
      return res.json(appointment)
    }

    // Appointment deposit
    const depositMatch = path.match(/^\/appointments\/([^/]+)\/deposit$/)
    if (depositMatch && method === 'PATCH') {
      const id = depositMatch[1]
      const { depositPaid, depositAmount } = parseBody(req)
      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          depositPaid,
          depositAmount,
          depositPaidAt: depositPaid ? new Date() : null
        },
        include: { client: true }
      })
      return res.json(appointment)
    }

    // ============ HEALTH ============
    if (path === '/health' || path === '/') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() })
    }

    // 404
    return res.status(404).json({ error: 'Rota não encontrada', path })

  } catch (error: any) {
    console.error('API Error:', error)
    return res.status(500).json({ error: error.message || 'Erro interno' })
  } finally {
    await prisma.$disconnect()
  }
}
