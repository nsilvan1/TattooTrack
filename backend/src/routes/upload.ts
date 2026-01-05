import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const prisma = new PrismaClient()

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const filename = `${uuidv4()}${ext}`
    cb(null, filename)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

// Generic upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const url = `/uploads/${req.file.filename}`
    res.json({ url })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

// Upload reference for client
router.post('/reference/:clientId', upload.single('image'), async (req, res) => {
  try {
    const { clientId } = req.params
    const { notes } = req.body

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const imageUrl = `/uploads/${req.file.filename}`

    const reference = await prisma.reference.create({
      data: {
        clientId,
        imageUrl,
        notes,
      },
    })

    res.status(201).json(reference)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to upload reference' })
  }
})

export default router
