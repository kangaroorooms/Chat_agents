import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'docs/', 'src/**/*.d.ts'],
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    setupFiles: ['./test/setup.ts'],
  },
})
