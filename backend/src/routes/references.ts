import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const router = Router()
const prisma = new PrismaClient()

// Delete reference
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const reference = await prisma.reference.findUnique({
      where: { id },
    })

    if (reference) {
      // Delete the file
      const filePath = path.join(__dirname, '../../../uploads', reference.imageUrl.replace('/uploads/', ''))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      await prisma.reference.delete({
        where: { id },
      })
    }

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete reference' })
  }
})

export default router
