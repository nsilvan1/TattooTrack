import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Update tattoo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { description, bodyPart, date, price, notes, images } = req.body

    const tattoo = await prisma.tattoo.update({
      where: { id },
      data: {
        description,
        bodyPart,
        date: date ? new Date(date) : undefined,
        price,
        notes,
        images: images ? JSON.stringify(images) : undefined,
      },
    })

    res.json(tattoo)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update tattoo' })
  }
})

// Delete tattoo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.tattoo.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete tattoo' })
  }
})

export default router
