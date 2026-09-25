// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      react: { version: '18.3' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
    },
    rules: {
      // React rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Every container loads through `useEffect(() => { load() })` and the form
      // dialogs mirror a prop into local display state the same way. That is the
      // pattern this rule exists to discourage, but the app does not run the
      // React Compiler, and replacing it means reworking every container's
      // data loading rather than fixing a defect.
      'react-hooks/set-state-in-effect': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Clean code rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Prettier
      'prettier/prettier': 'error',

      // React refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Command-line tools, where stdout is the product rather than a stray debug
    // line. `Logger` is for the app, which has a user to notify instead.
    files: ['scripts/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['public/service-worker.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        self: true,
        caches: true,
        fetch: true,
      },
    },
  }
);
