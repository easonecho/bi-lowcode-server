import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import skipFormatting from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/migrations/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  skipFormatting,
  {
    name: 'app/custom-rules',
    files: ['**/*.{ts,mts,js,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'no-useless-constructor': 'error',
      'no-duplicate-imports': 'error',
      'no-return-await': 'error',
      'require-await': 'warn',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': 'allow-with-description',
          'ts-expect-error': 'allow-with-description',
        },
      ],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  },
  {
    name: 'app/test-files',
    files: ['**/tests/**/*.{ts,mts}', '**/*.spec.{ts,mts}', '**/*.test.{ts,mts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
    },
  },
)