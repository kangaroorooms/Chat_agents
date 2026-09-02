export const openapiDocument = {
  openapi: '3.0.3',
  info: { title: 'Chatbot SaaS API', version: '1.0.0' },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKeyAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'API key' },
      widgetToken: { type: 'apiKey', in: 'header', name: 'X-Widget-Token' },
    },
    schemas: {
      Error: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } },
      Health: { type: 'object', required: ['status'], properties: { status: { type: 'string' } } },
      LoginRequest: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' }, mfaToken: { type: 'string' } } },
      TokenResponse: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } },
      SecurityPolicy: { type: 'object', properties: { minPasswordLength: { type: 'integer', minimum: 8 }, sessionTimeoutMinutes: { type: 'integer', minimum: 5 }, allowedEmailDomains: { type: 'array', items: { type: 'string' } }, ipAllowlist: { type: 'array', items: { type: 'string' } } } },
    },
  },
  paths: {
    '/auth/login': { post: { tags: ['Authentication'], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } }, responses: { '200': { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } }, '401': { description: 'Invalid credentials' } } } },
    '/auth/refresh': { post: { tags: ['Authentication'], responses: { '200': { description: 'Rotated token', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } } } } },
    '/health': { get: { tags: ['Operations'], responses: { '200': { description: 'Healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } } } } } },
    '/health/queues': { get: { tags: ['Operations'], responses: { '200': { description: 'Queue counts' }, '503': { description: 'Queue unavailable' } } } },
    '/health/workers': { get: { tags: ['Operations'], responses: { '200': { description: 'Workers healthy' }, '503': { description: 'Workers unavailable' } } } },
    '/identity/security/policy': { get: { tags: ['Identity'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Company security policy', content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityPolicy' } } } } } }, patch: { tags: ['Identity'], security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SecurityPolicy' } } } }, responses: { '200': { description: 'Updated policy' } } } },
    '/identity/security/dashboard': { get: { tags: ['Identity'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Security dashboard' } } } },
    '/identity/auth/mfa/setup': { post: { tags: ['Identity'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'MFA enrollment data' } } } },
    '/identity/auth/sessions': { get: { tags: ['Identity'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'Active sessions' } } } },
    '/identity/scim/v2/Users': { get: { tags: ['SCIM'], security: [{ bearerAuth: [] }], responses: { '200': { description: 'SCIM users' } } }, post: { tags: ['SCIM'], security: [{ bearerAuth: [] }], responses: { '201': { description: 'Provisioned user' } } } },
    '/metrics': { get: { tags: ['Operations'], responses: { '200': { description: 'Prometheus metrics', content: { 'text/plain': { schema: { type: 'string' } } } } } } },
  },
} as const
