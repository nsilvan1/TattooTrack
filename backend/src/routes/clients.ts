import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const router = Router()
const prisma = new PrismaClient()

// Multer setup for reference uploads
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().nullable(),
  instagram: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medicalNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
})

// List clients with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { search, tagIds, page = '1', limit = '10' } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
        { instagram: { contains: search as string } },
        { email: { contains: search as string } },
      ]
    }

    if (tagIds) {
      const tagIdArray = (tagIds as string).split(',')
      where.tags = {
        some: {
          tagId: { in: tagIdArray },
        },
      }
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.client.count({ where }),
    ])

    res.json({
      data: clients,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch clients' })
  }
})

// Get single client
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        tattoos: {
          orderBy: { createdAt: 'desc' },
        },
        references: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    res.json(client)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch client' })
  }
})

// Create client
router.post('/', async (req, res) => {
  try {
    const data = clientSchema.parse(req.body)
    const { tagIds, birthDate, ...clientData } = data

    const client = await prisma.client.create({
      data: {
        ...clientData,
        birthDate: birthDate ? new Date(birthDate) : null,
        tags: tagIds
          ? {
              create: tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    res.status(201).json(client)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create client' })
  }
})

// Update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = clientSchema.partial().parse(req.body)
    const { tagIds, birthDate, ...clientData } = data

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...clientData,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    res.json(client)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to update client' })
  }
})

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.client.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete client' })
  }
})

// Add tag to client
router.post('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params
    const { tagId } = req.body

    await prisma.clientTag.create({
      data: {
        clientId: id,
        tagId,
      },
    })

    res.status(201).json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to add tag' })
  }
})

// Remove tag from client
router.delete('/:id/tags/:tagId', async (req, res) => {
  try {
    const { id, tagId } = req.params

    await prisma.clientTag.delete({
      where: {
        clientId_tagId: {
          clientId: id,
          tagId,
        },
      },
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to remove tag' })
  }
})

// Get client tattoos
router.get('/:id/tattoos', async (req, res) => {
  try {
    const { id } = req.params

    const tattoos = await prisma.tattoo.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    })

    res.json(tattoos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch tattoos' })
  }
})

// Create tattoo for client
router.post('/:id/tattoos', async (req, res) => {
  try {
    const { id } = req.params
    const { description, bodyPart, date, price, notes, images } = req.body

    const tattoo = await prisma.tattoo.create({
      data: {
        clientId: id,
        description,
        bodyPart,
        date: date ? new Date(date) : null,
        price,
        notes,
        images: JSON.stringify(images || []),
      },
    })

    res.status(201).json(tattoo)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create tattoo' })
  }
})

// Upload reference for client with file
router.post('/:id/references', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const imageUrl = `/uploads/${req.file.filename}`

    const reference = await prisma.reference.create({
      data: {
        clientId: id,
        imageUrl,
        notes,
      },
    })

    res.status(201).json(reference)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create reference' })
  }
})

export default router
