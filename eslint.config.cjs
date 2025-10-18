// ESLint v9 flat config
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'public/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.mocha
      }
    },
    rules: {
      // Mocha often uses unused expressions in expect style
      'no-unused-expressions': 'off'
    }
  }
];
