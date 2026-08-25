# Security Hardening

This project applies several basic security hardening measures by default.

## Middlewares

- `helmet()` — sets secure HTTP headers.
- `express-rate-limit` — basic IP-based rate limiting to mitigate brute-force and abusive requests.
- `cors` — configured in `src/app.ts` for allowed origins and credentials.

## Configuration

- CORS origin is currently `http://localhost:5173` (development). Update `src/app.ts` to use environment-driven allowed origins for production.
- Rate limiter uses 15-minute windows with a default max of 100 requests per IP. Adjust as needed behind a proxy or load-balancer.

## Recommendations

- Run the app behind a reverse proxy and enable `trust proxy` when using load balancers.
- Use stricter CSP policies and refine helmet options in production.
- Integrate IP-blocking and request logging for suspicious activity.
