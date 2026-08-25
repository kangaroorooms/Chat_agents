const js = require('@eslint/js')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const tsRecommendedRules = (tsPlugin.configs && tsPlugin.configs.recommended && tsPlugin.configs.recommended.rules) || {}

module.exports = [
  // include base JS recommended rules
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        sourceType: 'script'
      },
      // provide Node globals like process, require, __dirname
      globals: require('globals').node
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: Object.assign({}, tsRecommendedRules, {
      // prefer TS-aware no-unused-vars
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',

      // warnings
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn'
    })
  },
  // ignore output and deps
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] }
]
