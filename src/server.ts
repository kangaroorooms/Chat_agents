import { closeSocketServer, initSocketServer } from './modules/socket/socket.server'
import { initDomainEventSubscribers } from './modules/events'
import { billingService } from './modules/billing/billing.service'
import { startWorkers, stopWorkers } from './infrastructure/workers'
import { startTracing, stopTracing } from './infrastructure/tracing'
import { logger } from './infrastructure/logger'

initDomainEventSubscribers()
void billingService.ensureDefaultPlans().catch((error) => logger.error({ err: error }, 'Billing plan bootstrap failed'))
startTracing()
startWorkers()
initSocketServer()

let shuttingDown = false
const shutdown = async (signal: string) => {
	if (shuttingDown) return
	shuttingDown = true
	logger.info({ signal }, 'Graceful shutdown started')
	await stopWorkers()
	await stopTracing()
	await closeSocketServer()
	process.exit(0)
}
process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))
