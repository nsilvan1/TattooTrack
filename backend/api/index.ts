import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import clientsRouter from '../src/routes/clients'
import tagsRouter from '../src/routes/tags'
import tattoosRouter from '../src/routes/tattoos'
import referencesRouter from '../src/routes/references'
import uploadRouter from '../src/routes/upload'
import appointmentsRouter from '../src/routes/appointments'
import authRouter from '../src/routes/auth'

const app = express()

// CORS configurado para aceitar qualquer origem em produção
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/api/clients', clientsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/tattoos', tattoosRouter)
app.use('/api/references', referencesRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/auth', authRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Root
app.get('/api', (req, res) => {
  res.json({ message: 'TattooTrack API', version: '1.0.0' })
})

export default app
