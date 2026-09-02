import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const queueNames = {
  email: 'email-queue',
  webhook: 'webhook-queue',
  knowledgeTraining: 'knowledge-training-queue',
  analytics: 'analytics-queue',
  sla: 'sla-queue',
  deadLetter: 'dead-letter-queue',
} as const

export type QueueName = typeof queueNames[keyof typeof queueNames]
export type QueueJob =
  | { queue: 'email'; name: 'send-reply'; data: { conversationId: string; content: string } }
  | { queue: 'webhook'; name: 'deliver'; data: { webhookId: string; event: string; payload: unknown; attempt?: number } }
  | { queue: 'knowledgeTraining'; name: 'train'; data: { documentId: string; companyId: string } }
  | { queue: 'analytics'; name: 'record'; data: { companyId: string; conversationId?: string; messageId?: string; eventType: string; confidence?: number; metadata?: unknown } }
  | { queue: 'sla'; name: 'check-breaches'; data: { companyId: string } }
  | { queue: 'deadLetter'; name: 'failed-job'; data: { sourceQueue: string; jobId: string; payload: unknown; error: string } }

let connection: IORedis | null = null
const queues = new Map<QueueName, Queue>()
export const webhookAttempts = 6
export const webhookBackoffDelayMs = 60_000

export function redisConfigured(): boolean { return Boolean(process.env.REDIS_URL) }

export function getRedisConnection(): IORedis {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required for queue workers')
  if (!connection) connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: true })
  return connection
}

export function getQueue(name: QueueName): Queue {
  let queue = queues.get(name)
  if (!queue) {
    queue = new Queue(name, {
      connection: getRedisConnection(),
      defaultJobOptions: { attempts: name === queueNames.webhook ? webhookAttempts : 3, backoff: name === queueNames.webhook ? { type: 'exponential', delay: webhookBackoffDelayMs } : { type: 'fixed', delay: 5_000 }, removeOnComplete: 1000, removeOnFail: 5000 },
    })
    queues.set(name, queue)
  }
  return queue
}

export async function enqueue(job: QueueJob): Promise<string | null> {
  if (!redisConfigured()) return null
  const queue = getQueue(queueNames[job.queue])
  const created = await queue.add(job.name, job.data)
  return created.id ?? null
}

export async function queueCounts(): Promise<Record<string, Record<string, number>>> {
  if (!redisConfigured()) return {}
  const result: Record<string, Record<string, number>> = {}
  for (const name of Object.values(queueNames)) result[name] = await getQueue(name).getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
  return result
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()))
  queues.clear()
  if (connection) { await connection.quit(); connection = null }
}