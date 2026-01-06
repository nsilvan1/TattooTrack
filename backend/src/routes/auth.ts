import { Router } from 'express'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET || 'tattootrack_secret_key'

// Schemas de validação
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres').regex(/^[a-zA-Z0-9_]+$/, 'Username pode conter apenas letras, números e _'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

const loginSchema = z.object({
  username: z.string().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

// Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)

    // Verificar se username já existe
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      return res.status(400).json({ error: 'Este username já está em uso' })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: hashedPassword,
      },
    })

    // Gerar JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        calendarConnected: user.calendarConnected,
      },
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    res.status(500).json({ error: 'Erro ao criar conta' })
  }
})

// Login com username/senha
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' })
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(data.password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos' })
    }

    // Gerar JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        picture: user.picture,
        calendarConnected: user.calendarConnected,
      },
    })
  } catch (error) {
    console.error('Erro no login:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message })
    }
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// Verificar token e retornar dados do usuário
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        name: true,
        picture: true,
        calendarConnected: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    res.json(user)
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
})

// ============================================
// INTEGRAÇÃO COM GOOGLE CALENDAR (Opcional)
// ============================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

// Iniciar conexão com Google Calendar
router.get('/google/connect', async (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Gerar URL com state contendo o userId
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: decoded.userId, // Passar userId para o callback
    })

    res.json({ url: authUrl })
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
})

// Callback do Google OAuth para Calendar
router.get('/google/callback', async (req, res) => {
  const { code, state: userId } = req.query

  if (!code || !userId) {
    return res.redirect(`${process.env.FRONTEND_URL}/settings?error=no_code`)
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string)

    // Atualizar usuário com tokens do Google
    await prisma.user.update({
      where: { id: userId as string },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarConnected: true,
      },
    })

    res.redirect(`${process.env.FRONTEND_URL}/settings?google=connected`)
  } catch (error) {
    console.error('Erro no callback do Google:', error)
    res.redirect(`${process.env.FRONTEND_URL}/settings?error=google_failed`)
  }
})

// Desconectar Google Calendar
router.post('/google/disconnect', async (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any

    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        calendarConnected: false,
      },
    })

    res.json({ success: true })
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
})

// Verificar status da conexão com Google Calendar
router.get('/google/status', async (req, res) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        calendarConnected: true,
        googleTokenExpiry: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const isExpired = user.googleTokenExpiry ? new Date() > user.googleTokenExpiry : true

    res.json({
      connected: user.calendarConnected && !isExpired,
    })
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
})

export default router
