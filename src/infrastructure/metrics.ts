import client from 'prom-client'

client.collectDefaultMetrics()
export const queueJobs = new client.Counter({ name: 'queue_jobs_total', help: 'Jobs processed by queue', labelNames: ['queue', 'status'] })
export const queueDuration = new client.Histogram({ name: 'queue_job_duration_seconds', help: 'Queue job duration', labelNames: ['queue'] })
export const aiLatency = new client.Histogram({ name: 'ai_response_duration_seconds', help: 'AI response latency', labelNames: ['outcome'] })
export const dbQueryDuration = new client.Histogram({ name: 'db_query_duration_seconds', help: 'Database operation duration', labelNames: ['operation'] })
export const webhookDeliveries = new client.Counter({ name: 'webhook_deliveries_total', help: 'Webhook delivery outcomes', labelNames: ['status'] })
export const requestsTotal = new client.Counter({ name: 'requests_total', help: 'HTTP requests', labelNames: ['method', 'route', 'status'] })
export const requestDuration = new client.Histogram({ name: 'request_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'route'] })
export async function metricsText(): Promise<string> { return client.register.metrics() }