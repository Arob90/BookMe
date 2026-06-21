'use server'

import { db } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'

export interface WhatsAppMessage {
  message: string
  phoneNumber: string | null
  whatsappUrl: string
}

export async function generateAppointmentConfirmationMessage(appointmentId: string): Promise<WhatsAppMessage | null> {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      appointmentServices: {
        include: {
          service: true,
        },
      },
    },
  })

  if (!appointment || !appointment.client) {
    return null
  }

  const client = appointment.client
  const services = appointment.appointmentServices.map((as: any) => as.service.name).join(', ')
  const startTime = formatDateTime(appointment.startAt)
  const totalPrice = Number(appointment.totalPrice || 0)

  // Format phone number (remove any non-digit characters except +)
  let phoneNumber = client.phone
  if (phoneNumber) {
    // Remove spaces, dashes, parentheses
    phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '')
    // If it doesn't start with +, assume it's a local number and might need country code
    // For now, we'll use it as-is and let the user adjust
  }

  const message = `Hi ${client.firstName}! 👋

Your appointment has been confirmed! ✅

📅 Date & Time: ${startTime}
💆 Services: ${services}
💰 Total: $${totalPrice.toFixed(2)}

We look forward to seeing you!

If you need to reschedule or have any questions, please contact us.

Thank you! 🙏`

  // Create WhatsApp URL
  // Format: https://wa.me/[phone]?text=[encoded message]
  let whatsappUrl = ''
  if (phoneNumber) {
    const encodedMessage = encodeURIComponent(message)
    whatsappUrl = `https://wa.me/${phoneNumber.replace(/\+/g, '')}?text=${encodedMessage}`
  }

  return {
    message,
    phoneNumber,
    whatsappUrl,
  }
}
