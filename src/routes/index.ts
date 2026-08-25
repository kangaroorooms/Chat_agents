import { Router } from 'express'

import authRoutes from '../modules/auth/auth.routes'
import userRoutes from '../modules/users/user.routes'
import companyRoutes from '../modules/companies/company.routes'
import conversationRoutes from '../modules/conversations/conversation.routes'
import messageRoutes from '../modules/messages/message.routes'
import { aiRoutes } from '../modules/ai/ai.routes'
import knowledgeRoutes from '../modules/knowledge/knowledge.routes'
import widgetRoutes from '../modules/widget/widget.routes'
import auditRoutes from '../modules/audit/audit.routes'
import enterpriseRoutes from '../modules/enterprise/enterprise.routes'
import healthRoutes from '../modules/health/health.routes'
import emailRoutes from '../modules/email/email.routes'
import billingRoutes from '../modules/billing/billing.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/companies', companyRoutes)
router.use('/conversations', conversationRoutes)
router.use('/messages', messageRoutes)
router.use('/ai', aiRoutes)
router.use('/knowledge', knowledgeRoutes)
router.use('/widget', widgetRoutes)
router.use('/audit-logs', auditRoutes)
router.use('/billing', billingRoutes)
router.use('/', enterpriseRoutes)
router.use('/health', healthRoutes)
router.use('/email', emailRoutes)

export default router
