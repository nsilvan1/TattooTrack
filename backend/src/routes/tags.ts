import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

// List all tags
router.get('/', async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    })

    res.json(tags)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch tags' })
  }
})

// Create tag
router.post('/', async (req, res) => {
  try {
    const data = tagSchema.parse(req.body)

    const tag = await prisma.tag.create({
      data,
    })

    res.status(201).json(tag)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create tag' })
  }
})

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = tagSchema.parse(req.body)

    const tag = await prisma.tag.update({
      where: { id },
      data,
    })

    res.json(tag)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to update tag' })
  }
})

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.tag.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
})

export default router
