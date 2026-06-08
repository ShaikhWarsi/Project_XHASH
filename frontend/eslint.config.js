import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    plugins: {
      local: {
        rules: {
          'no-empty-catch': {
            meta: {
              type: 'suggestion',
              docs: { description: 'Flag .catch(() => {}) which silently swallows errors' },
              fixable: 'code',
            },
            create(context) {
              return {
                'CallExpression[callee.property.name="catch"]'(node) {
                  const arg = node.arguments[0]
                  if (arg && (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression')) {
                    const body = arg.body
                    if (body.type === 'BlockStatement' && body.body.length === 0) {
                      context.report({
                        node,
                        message: 'Promise.catch() with empty callback swallows errors silently. Add error handling.',
                      })
                    }
                  }
                },
              }
            },
          },
        },
      },
    },
    rules: {
      'local/no-empty-catch': 'warn',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'local/no-empty-catch': 'off',
    },
  },
])
