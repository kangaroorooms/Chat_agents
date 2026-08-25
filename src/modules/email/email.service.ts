import { prisma } from '../../config/prisma'
import { usageService } from '../billing/usage.service'

type InboundEmail = { to: string; from: string; subject?: string; text: string; messageId?: string }
export class EmailService {
  async receive(input: InboundEmail) {
    const channel = await prisma.emailChannel.findFirst({ where: { email: input.to.toLowerCase(), status: 'ACTIVE' } })
    if (!channel) throw new Error('No active email channel for recipient')
    const conversation = await prisma.conversation.create({ data: { companyId: channel.companyId, title: input.subject || `Email from ${input.from}`, state: 'OPEN', queueState: 'NEW', metadata: { channel: 'email', from: input.from, to: input.to, messageId: input.messageId ?? null } } })
    const message = await prisma.message.create({ data: { conversationId: conversation.id, companyId: channel.companyId, content: input.text, metadata: { channel: 'email', senderType: 'external', from: input.from } } })
    void usageService.record(channel.companyId, 'conversations', 1, { conversationId: conversation.id, channel: 'email' }).catch(() => undefined)
    void usageService.record(channel.companyId, 'messages', 1, { conversationId: conversation.id, messageId: message.id }).catch(() => undefined)
    return { conversation, message }
  }

  async sendReply(conversationId: string, content: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    const metadata = conversation?.metadata as Record<string, unknown> | null
    if (!conversation || metadata?.channel !== 'email' || typeof metadata.from !== 'string' || !conversation.companyId) return
    const channel = await prisma.emailChannel.findFirst({ where: { companyId: conversation.companyId, status: 'ACTIVE' } })
    if (!channel) return
    try {
      if (channel.provider.toLowerCase() === 'sendgrid') {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { authorization: `Bearer ${channel.apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: metadata.from }] }], from: { email: channel.email }, subject: conversation.title || 'Support reply', content: [{ type: 'text/plain', value: content }] }) })
        if (!response.ok) throw new Error(`SendGrid returned ${response.status}`)
      } else if (channel.provider.toLowerCase() === 'mailgun') {
        const body = new URLSearchParams({ from: channel.email, to: metadata.from, subject: conversation.title || 'Support reply', text: content })
        const domain = channel.email.split('@')[1]
        const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, { method: 'POST', headers: { authorization: `Basic ${Buffer.from(`api:${channel.apiKey}`).toString('base64')}` }, body })
        if (!response.ok) throw new Error(`Mailgun returned ${response.status}`)
      } else throw new Error('Unsupported email provider')
    } catch (error) { await prisma.emailChannel.update({ where: { id: channel.id }, data: { status: 'ERROR', lastErrorAt: new Date(), lastErrorMsg: error instanceof Error ? error.message : 'Email delivery failed' } }); throw error }
  }
}
export const emailService = new EmailService()
