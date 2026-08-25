import { Router } from 'express'
import { z } from 'zod'
import { emailService } from './email.service'
const router = Router()
router.post('/webhook', async (req, res) => {
  try {
    const body = z.object({ to: z.string().email(), from: z.string().email(), subject: z.string().max(998).optional(), text: z.string().min(1).max(100000), messageId: z.string().max(500).optional() }).parse({ to: req.body.to || req.body.recipient, from: req.body.from || req.body.sender, subject: req.body.subject, text: req.body.text || req.body['stripped-text'] || req.body.bodyPlain, messageId: req.body.messageId || req.body['Message-Id'] })
    const data = await emailService.receive(body)
    res.status(201).json({ success: true, data: { conversationId: data.conversation.id, messageId: data.message.id } })
  } catch (error) { res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid email payload' }) }
})
export default router
