import { initSocketServer } from './modules/socket/socket.server'
import { initDomainEventSubscribers } from './modules/events'
import { billingService } from './modules/billing/billing.service'

initDomainEventSubscribers()
void billingService.ensureDefaultPlans().catch((error) => console.error('Billing plan bootstrap failed', error))
initSocketServer()
