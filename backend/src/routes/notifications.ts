import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /notifications - Listar notificações do usuário
router.get('/', async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Últimas 50 notificações
    })

    res.json(notifications)
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    res.status(500).json({ error: 'Erro ao buscar notificações' })
  }
})

// GET /notifications/unread-count - Contar notificações não lidas
router.get('/unread-count', async (req: any, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.userId,
        read: false,
      },
    })

    res.json({ count })
  } catch (error) {
    console.error('Erro ao contar notificações:', error)
    res.status(500).json({ error: 'Erro ao contar notificações' })
  }
})

// PATCH /notifications/:id/read - Marcar notificação como lida
router.patch('/:id/read', async (req: any, res) => {
  try {
    const { id } = req.params

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        userId: req.userId,
      },
      data: { read: true },
    })

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error)
    res.status(500).json({ error: 'Erro ao atualizar notificação' })
  }
})

// PATCH /notifications/read-all - Marcar todas como lidas
router.patch('/read-all', async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        read: false,
      },
      data: { read: true },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error)
    res.status(500).json({ error: 'Erro ao atualizar notificações' })
  }
})

// DELETE /notifications/:id - Deletar notificação
router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params

    const notification = await prisma.notification.deleteMany({
      where: {
        id,
        userId: req.userId,
      },
    })

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar notificação:', error)
    res.status(500).json({ error: 'Erro ao deletar notificação' })
  }
})

// POST /notifications/send - Enviar notificação (apenas admin)
router.post('/send', async (req: any, res) => {
  try {
    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true },
    })

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem enviar notificações' })
    }

    const { userId, title, message, type, reportId } = req.body

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title e message são obrigatórios' })
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info',
        reportId,
      },
    })

    res.status(201).json(notification)
  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    res.status(500).json({ error: 'Erro ao enviar notificação' })
  }
})

export default router
