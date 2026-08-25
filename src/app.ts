import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import routes from "./routes";
import { errorHandler } from "./middleware/error.middleware";
import { requestObservability } from './middleware/observability.middleware'
import healthRoutes from './modules/health/health.routes'
import { serveWidgetScript } from './modules/widget/widget.script'
import { authenticateApiKey } from './middleware/api-key.middleware'

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
app.use(helmet())

// Rate limiter to mitigate brute-force and abusive requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

app.use('/api/billing/webhooks', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '1mb' }));
app.use(requestObservability)
app.use(authenticateApiKey)
app.use('/health', healthRoutes)
app.get('/widget.js', serveWidgetScript)

// parse cookies for refresh token handling
app.use(cookieParser());

app.use("/api", routes);

// Centralized error handler
app.use(errorHandler);

export default app;
