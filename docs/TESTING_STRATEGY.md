# Testing Strategy

- Node: 20.x LTS (see .nvmrc)
- Test runner: Vitest (pinned in devDependencies)
- Coverage provider: v8 via @vitest/coverage-v8
- Global mocks: `test/setup.ts` mocks OpenAI and Prisma client
- Factories: `test/factories/*` provide lightweight object factories for unit tests
- Builders: `test/builders/*` provide test doubles for services like Prisma

Commands

- Install dependencies: `npm install`
- Run tests: `npm test`
- Run tests with coverage: `npm run test:coverage`

Notes

- Tests avoid calling external services; they use local mocks and factories.
- If Node version differs, use `nvm install 20 && nvm use 20` before running tests.
