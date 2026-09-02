import { Worker } from 'bullmq'
import { queueNames, getRedisConnection, redisConfigured, closeQueues, enqueue, type QueueName } from './queues'
import { queueJobs, queueDuration } from './metrics'
import { emailService } from '../modules/email/email.service'
import { webhookService } from '../modules/webhooks/webhook.service'
import { knowledgeTrainingService } from '../modules/knowledge/training/knowledge-training.service'
import { analyticsService } from '../modules/ai/analytics/analytics.service'
import { slaService } from '../modules/sla/sla.service'
import { logger } from './logger'

const workers: Worker[] = []
let started = false

export function startWorkers(): void {
  if (started || !redisConfigured()) return
  started = true
  const processors: Record<QueueName, (job: any) => Promise<unknown>> = {
    [queueNames.email]: (job) => emailService.sendReply(job.data.conversationId, job.data.content),
    [queueNames.webhook]: (job) => webhookService.dispatch(job.data.webhookId, job.data.event, job.data.payload, job.attemptsMade),
    [queueNames.knowledgeTraining]: (job) => knowledgeTrainingService.trainDocument(job.data.documentId, job.data.companyId),
    [queueNames.analytics]: (job) => analyticsService.recordNow(job.data),
    [queueNames.sla]: (job) => slaService.checkBreaches(job.data.companyId),
    [queueNames.deadLetter]: async (job) => { logger.error({ queue: job.data.sourceQueue, jobId: job.data.jobId, error: job.data.error }, 'Job moved to dead-letter queue') },
  }
  for (const name of Object.values(queueNames)) {
    const worker = new Worker(name, async (job) => {
      const timer = queueDuration.startTimer({ queue: name })
      try { const result = await processors[name](job); queueJobs.inc({ queue: name, status: 'success' }); return result }
      catch (error) { queueJobs.inc({ queue: name, status: 'failed' }); throw error }
      finally { timer() }
    }, { connection: getRedisConnection(), concurrency: 5 })
    worker.on('failed', (job, error) => {
      if (!job) return
      logger.error({ queue: name, jobId: job.id, err: error }, 'Queue job failed')
      if (name === queueNames.webhook && job.attemptsMade >= (job.opts.attempts ?? 1)) void enqueue({ queue: 'deadLetter', name: 'failed-job', data: { sourceQueue: name, jobId: job.id ?? 'unknown', payload: job.data, error: error.message } }).catch(() => undefined)
    })
    workers.push(worker)
  }
}

export function workersHealthy(): boolean { return redisConfigured() && started && workers.length === Object.values(queueNames).length }
export async function stopWorkers(): Promise<void> { await Promise.all(workers.map((worker) => worker.close())); workers.length = 0; started = false; await closeQueues() }