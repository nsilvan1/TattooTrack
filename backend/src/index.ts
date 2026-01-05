import express from 'express'
import cors from 'cors'
import path from 'path'
import clientsRouter from './routes/clients'
import tagsRouter from './routes/tags'
import tattoosRouter from './routes/tattoos'
import referencesRouter from './routes/references'
import uploadRouter from './routes/upload'
import appointmentsRouter from './routes/appointments'

const app = express()
const PORT = process.env.PORT || 3333

app.use(cors())
app.use(express.json())

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

// Routes
app.use('/api/clients', clientsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/tattoos', tattoosRouter)
app.use('/api/references', referencesRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/appointments', appointmentsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
