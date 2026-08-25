import { Router } from 'express'
import { prisma } from '../../config/prisma'
const router = Router()
router.get('/', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
router.get('/database', async (_req, res) => { try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok' }) } catch { res.status(503).json({ status: 'unavailable' }) } })
router.get('/redis', async (_req, res) => { if (!process.env.REDIS_URL) return res.status(503).json({ status: 'not_configured' }); try { const { createClient } = require('redis'); const client = createClient({ url: process.env.REDIS_URL }); await client.connect(); await client.ping(); await client.quit(); res.json({ status: 'ok' }) } catch { res.status(503).json({ status: 'unavailable' }) } })
export default router
