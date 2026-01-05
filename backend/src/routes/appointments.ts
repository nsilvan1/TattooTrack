import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

const appointmentSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  date: z.string(), // ISO date string
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm format
  estimatedHours: z.number().min(0.5).max(12),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  price: z.number().optional().nullable(),
  depositAmount: z.number().optional().nullable(),
  depositPaid: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

// Helper function to convert time string to minutes
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to check for time conflicts
async function checkTimeConflict(
  date: Date,
  startTime: string,
  estimatedHours: number,
  excludeId?: string
): Promise<{ hasConflict: boolean; conflictingAppointment?: any }> {
  // Get start and end of the day
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  // Get all appointments for that day (excluding cancelled ones)
  const dayAppointments = await prisma.appointment.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        not: 'cancelled',
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      client: {
        select: {
          name: true,
        },
      },
    },
  })

  const newStartMinutes = timeToMinutes(startTime)
  const newEndMinutes = newStartMinutes + estimatedHours * 60

  for (const apt of dayAppointments) {
    const aptStartMinutes = timeToMinutes(apt.startTime)
    const aptEndMinutes = aptStartMinutes + apt.estimatedHours * 60

    // Check for overlap: new appointment starts before existing ends AND new appointment ends after existing starts
    if (newStartMinutes < aptEndMinutes && newEndMinutes > aptStartMinutes) {
      return {
        hasConflict: true,
        conflictingAppointment: {
          id: apt.id,
          title: apt.title,
          clientName: apt.client.name,
          startTime: apt.startTime,
          endTime: `${String(Math.floor(aptEndMinutes / 60)).padStart(2, '0')}:${String(aptEndMinutes % 60).padStart(2, '0')}`,
        },
      }
    }
  }

  return { hasConflict: false }
}

// List all appointments with optional filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, clientId } = req.query

    const where: any = {}

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      }
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate as string),
      }
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate as string),
      }
    }

    if (status) {
      where.status = status
    }

    if (clientId) {
      where.clientId = clientId
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            instagram: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    })

    res.json(appointments)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch appointments' })
  }
})

// Get single appointment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            instagram: true,
          },
        },
      },
    })

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    res.json(appointment)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch appointment' })
  }
})

// Create appointment
router.post('/', async (req, res) => {
  try {
    const data = appointmentSchema.parse(req.body)
    const appointmentDate = new Date(data.date)

    // Check for time conflicts
    const conflict = await checkTimeConflict(appointmentDate, data.startTime, data.estimatedHours)
    if (conflict.hasConflict) {
      return res.status(409).json({
        error: 'Conflito de horário',
        message: `Já existe um agendamento neste horário: "${conflict.conflictingAppointment.title}" com ${conflict.conflictingAppointment.clientName} (${conflict.conflictingAppointment.startTime} - ${conflict.conflictingAppointment.endTime})`,
        conflictingAppointment: conflict.conflictingAppointment,
      })
    }

    const appointment = await prisma.appointment.create({
      data: {
        ...data,
        date: appointmentDate,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            instagram: true,
          },
        },
      },
    })

    res.status(201).json(appointment)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to create appointment' })
  }
})

// Update appointment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const data = appointmentSchema.partial().parse(req.body)

    // Get current appointment to check for time conflicts
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id },
    })

    if (!currentAppointment) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    // Check for time conflicts if date, time, or duration changed
    const newDate = data.date ? new Date(data.date) : currentAppointment.date
    const newStartTime = data.startTime || currentAppointment.startTime
    const newEstimatedHours = data.estimatedHours || currentAppointment.estimatedHours

    const conflict = await checkTimeConflict(newDate, newStartTime, newEstimatedHours, id)
    if (conflict.hasConflict) {
      return res.status(409).json({
        error: 'Conflito de horário',
        message: `Já existe um agendamento neste horário: "${conflict.conflictingAppointment.title}" com ${conflict.conflictingAppointment.clientName} (${conflict.conflictingAppointment.startTime} - ${conflict.conflictingAppointment.endTime})`,
        conflictingAppointment: conflict.conflictingAppointment,
      })
    }

    const updateData: any = { ...data }
    if (data.date) {
      updateData.date = new Date(data.date)
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            instagram: true,
          },
        },
      },
    })

    res.json(appointment)
  } catch (error) {
    console.error(error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    res.status(500).json({ error: 'Failed to update appointment' })
  }
})

// Update appointment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            instagram: true,
          },
        },
      },
    })

    res.json(appointment)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update appointment status' })
  }
})

// Update deposit status
router.patch('/:id/deposit', async (req, res) => {
  try {
    const { id } = req.params
    const { depositPaid, depositAmount } = req.body

    const updateData: any = {}

    if (typeof depositPaid === 'boolean') {
      updateData.depositPaid = depositPaid
      updateData.depositPaidAt = depositPaid ? new Date() : null
    }

    if (typeof depositAmount === 'number') {
      updateData.depositAmount = depositAmount
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            instagram: true,
          },
        },
      },
    })

    res.json(appointment)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update deposit status' })
  }
})

// Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.appointment.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete appointment' })
  }
})

// Get appointments by date range (for calendar view)
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            instagram: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    })

    res.json(appointments)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch calendar appointments' })
  }
})

export default router
