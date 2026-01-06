import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { google } from 'googleapis'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'tattootrack_secret_key'

// Google OAuth Config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://tattoo-track.vercel.app/api/auth/google/callback'

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
)

// Helper para criar evento no Google Calendar
async function createGoogleCalendarEvent(accessToken: string, appointment: any, clientName: string) {
  oauth2Client.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const [hours, minutes] = appointment.startTime.split(':').map(Number)
  const startDateTime = new Date(appointment.date)
  startDateTime.setHours(hours, minutes, 0, 0)

  const endDateTime = new Date(startDateTime)
  endDateTime.setHours(endDateTime.getHours() + (appointment.estimatedHours || 1))

  const event = {
    summary: `${appointment.title} - ${clientName}`,
    description: appointment.description || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 1440 }, // 1 dia antes
      ],
    },
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  })

  return response.data.id
}

// Helper para atualizar evento no Google Calendar
async function updateGoogleCalendarEvent(accessToken: string, eventId: string, appointment: any, clientName: string) {
  oauth2Client.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const [hours, minutes] = appointment.startTime.split(':').map(Number)
  const startDateTime = new Date(appointment.date)
  startDateTime.setHours(hours, minutes, 0, 0)

  const endDateTime = new Date(startDateTime)
  endDateTime.setHours(endDateTime.getHours() + (appointment.estimatedHours || 1))

  const event = {
    summary: `${appointment.title} - ${clientName}`,
    description: appointment.description || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
  }

  await calendar.events.update({
    calendarId: 'primary',
    eventId,
    requestBody: event,
  })
}

// Helper para deletar evento do Google Calendar
async function deleteGoogleCalendarEvent(accessToken: string, eventId: string) {
  oauth2Client.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  })
}

// Helper para refresh do token Google
async function refreshGoogleToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

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
  // Parse URL corretamente, removendo query string para matching de rotas
  const urlObj = new URL(url || '/', `http://${req.headers.host}`)
  const path = urlObj.pathname.replace('/api', '') || '/'

  // Debug log para verificar o path
  console.log('Request URL:', url, '| Parsed path:', path, '| Method:', method)

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

    // ============ GOOGLE AUTH ============
    if (path === '/auth/google/status' && method === 'GET') {
      const decoded = verifyToken(req)
      if (!decoded) return res.status(401).json({ error: 'Token inválido' })

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { calendarConnected: true, googleAccessToken: true }
      })

      return res.json({ connected: user?.calendarConnected || false })
    }

    if (path === '/auth/google/connect' && method === 'GET') {
      const decoded = verifyToken(req)
      if (!decoded) return res.status(401).json({ error: 'Token inválido' })

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Google OAuth não configurado' })
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ]

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: decoded.userId, // Passa o userId como state para identificar o usuário no callback
        prompt: 'consent', // Força a exibição do consent screen para obter refresh_token
      })

      return res.json({ url: authUrl })
    }

    if (path === '/auth/google/callback' && method === 'GET') {
      const { code, state: userId } = req.query as { code: string; state: string }

      if (!code || !userId) {
        return res.redirect('/settings?error=missing_params')
      }

      try {
        const { tokens } = await oauth2Client.getToken(code)

        await prisma.user.update({
          where: { id: userId },
          data: {
            googleAccessToken: tokens.access_token,
            googleRefreshToken: tokens.refresh_token,
            googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            calendarConnected: true,
          }
        })

        return res.redirect('/settings?google=connected')
      } catch (error) {
        console.error('Google OAuth callback error:', error)
        return res.redirect('/settings?error=oauth_failed')
      }
    }

    if (path === '/auth/google/disconnect' && method === 'POST') {
      const decoded = verifyToken(req)
      if (!decoded) return res.status(401).json({ error: 'Token inválido' })

      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          calendarConnected: false,
        }
      })

      return res.json({ success: true })
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
      const decoded = verifyToken(req)
      const data = parseBody(req)

      // Buscar cliente para obter o nome
      const client = await prisma.client.findUnique({ where: { id: data.clientId } })
      if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

      const appointment = await prisma.appointment.create({
        data: { ...data, date: new Date(data.date) },
        include: { client: true }
      })

      // Sincronizar com Google Calendar se conectado
      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { calendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true }
        })

        if (user?.calendarConnected && user.googleAccessToken) {
          try {
            // Verificar se precisa refresh do token
            let accessToken = user.googleAccessToken
            if (user.googleTokenExpiry && new Date(user.googleTokenExpiry) < new Date()) {
              if (user.googleRefreshToken) {
                const newTokens = await refreshGoogleToken(user.googleRefreshToken)
                accessToken = newTokens.access_token!
                await prisma.user.update({
                  where: { id: decoded.userId },
                  data: {
                    googleAccessToken: newTokens.access_token,
                    googleTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
                  }
                })
              }
            }

            const googleEventId = await createGoogleCalendarEvent(accessToken, appointment, client.name)
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: { googleEventId }
            })
            appointment.googleEventId = googleEventId
          } catch (error) {
            console.error('Erro ao criar evento no Google Calendar:', error)
            // Não bloqueia a criação do agendamento se falhar a sincronização
          }
        }
      }

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
        const decoded = verifyToken(req)
        const data = parseBody(req)
        if (data.date) data.date = new Date(data.date)

        const existingAppointment = await prisma.appointment.findUnique({
          where: { id },
          include: { client: true }
        })

        const appointment = await prisma.appointment.update({
          where: { id },
          data,
          include: { client: true }
        })

        // Sincronizar com Google Calendar se conectado
        if (decoded && existingAppointment?.googleEventId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { calendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true }
          })

          if (user?.calendarConnected && user.googleAccessToken) {
            try {
              let accessToken = user.googleAccessToken
              if (user.googleTokenExpiry && new Date(user.googleTokenExpiry) < new Date() && user.googleRefreshToken) {
                const newTokens = await refreshGoogleToken(user.googleRefreshToken)
                accessToken = newTokens.access_token!
                await prisma.user.update({
                  where: { id: decoded.userId },
                  data: { googleAccessToken: newTokens.access_token, googleTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null }
                })
              }
              await updateGoogleCalendarEvent(accessToken, existingAppointment.googleEventId, appointment, appointment.client.name)
            } catch (error) {
              console.error('Erro ao atualizar evento no Google Calendar:', error)
            }
          }
        }

        return res.json(appointment)
      }

      if (method === 'DELETE') {
        const decoded = verifyToken(req)
        const existingAppointment = await prisma.appointment.findUnique({ where: { id } })

        // Deletar evento do Google Calendar se existir
        if (decoded && existingAppointment?.googleEventId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { calendarConnected: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true }
          })

          if (user?.calendarConnected && user.googleAccessToken) {
            try {
              let accessToken = user.googleAccessToken
              if (user.googleTokenExpiry && new Date(user.googleTokenExpiry) < new Date() && user.googleRefreshToken) {
                const newTokens = await refreshGoogleToken(user.googleRefreshToken)
                accessToken = newTokens.access_token!
              }
              await deleteGoogleCalendarEvent(accessToken, existingAppointment.googleEventId)
            } catch (error) {
              console.error('Erro ao deletar evento do Google Calendar:', error)
            }
          }
        }

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
      return res.json({ status: 'ok', timestamp: new Date().toISOString(), debugPath: path, originalUrl: url })
    }

    // 404
    return res.status(404).json({ error: 'Rota não encontrada', path, originalUrl: url, method })

  } catch (error: any) {
    console.error('API Error:', error)
    return res.status(500).json({ error: error.message || 'Erro interno' })
  } finally {
    await prisma.$disconnect()
  }
}
