import js from '@eslint/js'
import globals from 'globals'
import n from 'eslint-plugin-n'
import promise from 'eslint-plugin-promise'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      n.configs['flat/recommended-script'],
      promise.configs['flat/recommended'],
    ],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // TypeScript owns module resolution; n's resolver misfires on TS path/ext rules.
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
    },
  },
])
