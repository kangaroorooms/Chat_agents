import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import helmet from 'helmet'

import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { requestObservability } from './middleware/observability.middleware'
import healthRoutes from './modules/health/health.routes'
import { serveWidgetScript } from './modules/widget/widget.script'
import { authenticateApiKey, apiKeyScopeGuard } from './middleware/api-key.middleware'
import { globalLimiter } from './middleware/rate-limit.middleware'
import { metricsText } from './infrastructure/metrics'
import swaggerUi from 'swagger-ui-express'
import { openapiDocument } from './infrastructure/openapi'

const app = express();

const corsOptions = {
  origin: (origin: any, callback: any) => {
    const allowed = [process.env.FRONTEND_URL, process.env.CORS_ORIGIN].filter(Boolean)
    if (!origin) return callback(null, true) // allow non-browser requests like curl/postman
    const isLocalhost = /^(https?:\/\/(localhost|127\.0\.0\.1))(:\d+)?$/.test(origin)
    if (allowed.includes(origin) || isLocalhost) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

// Basic security hardening
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
app.use((_req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// Rate limiter to mitigate brute-force and abusive requests
app.use(globalLimiter)

app.use('/api/billing/webhooks', express.raw({ type: 'application/json' }))
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: '1mb' }));
app.use(requestObservability)
app.use(authenticateApiKey)
app.use(apiKeyScopeGuard)
app.use('/health', healthRoutes)
app.get('/widget.js', serveWidgetScript)
app.get('/metrics', async (_req, res) => { res.setHeader('Content-Type', 'text/plain; version=0.0.4'); res.send(await metricsText()) })
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))

// parse cookies for refresh token handling
app.use(cookieParser());

app.use("/api", routes);

// Centralized error handler
app.use(errorHandler);

export default app;
