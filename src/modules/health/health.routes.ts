import { Router } from 'express'
import { prisma } from '../../config/prisma'
import { queueCounts } from '../../infrastructure/queues'
import { workersHealthy } from '../../infrastructure/workers'
const router = Router()
router.get('/', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
router.get('/database', async (_req, res) => { try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok' }) } catch { res.status(503).json({ status: 'unavailable' }) } })
router.get('/redis', async (_req, res) => { if (!process.env.REDIS_URL) return res.status(503).json({ status: 'not_configured' }); try { const { createClient } = require('redis'); const client = createClient({ url: process.env.REDIS_URL }); await client.connect(); await client.ping(); await client.quit(); res.json({ status: 'ok' }) } catch { res.status(503).json({ status: 'unavailable' }) } })
router.get('/queues', async (_req, res) => { try { res.json({ status: 'ok', queues: await queueCounts() }) } catch { res.status(503).json({ status: 'unavailable' }) } })
router.get('/workers', (_req, res) => { const healthy = workersHealthy(); res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'unavailable', workers: healthy }) })
export default router
