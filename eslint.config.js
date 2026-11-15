import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import hooks from 'eslint-plugin-react-hooks'

/**
 * ESLINT — the same rules as the app this code came out of, deliberately.
 *
 * ── WHY IT IS A COPY AND NOT AN OPINION ─────────────────────────────────────
 *
 * These components move both ways: they were lifted out of an app and they go
 * back into it as a dependency. A library that lints harder than its consumer
 * refuses code the consumer would have shipped; one that lints softer lets
 * through code the consumer then rejects. Either way somebody is editing a
 * file to satisfy a rule that is not about the code.
 *
 * ── WHAT THE RULES ARE ACTUALLY FOR ─────────────────────────────────────────
 *
 * A name that is used and does not exist. A bundler does not catch it: Vite
 * compiles `<Callout />` and `dragHandlers(b)` when nothing called either was
 * ever imported, and the failure is a ReferenceError on the screen that
 * renders them. `no-undef` catches the plain identifier; `react/jsx-no-undef`
 * catches the component name, because JSX identifiers are not references to
 * eslint's scope analyser and `no-undef` never looks at them.
 *
 * ── TWO WORLDS, AND THEY DO NOT SHARE A GLOBAL ──────────────────────────────
 *
 * `src/` runs in a browser, inside somebody else's app. `scripts/` runs in
 * node, here. Telling the linter which is which is what makes a script's bare
 * `window` an undefined variable rather than a kind of access — a real
 * mistake this repository has already made once.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**', 'harness/**'] },

  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      /* 'latest', NOT 2024: a JSON module is imported with an import ATTRIBUTE
         (`with { type: 'json' }`), which node requires and espree only parses
         from ES2025. Without this the emoji table is a parse error in the
         linter and nowhere else. */
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,

      'no-undef': 'error',
      'react/jsx-no-undef': 'error',
      // Without this, every component is "imported and never used" — eslint
      // does not read JSX as a use on its own.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',

      // A hook called conditionally is a real bug with a confusing symptom.
      'react-hooks/rules-of-hooks': 'error',
      // Deliberately off, as in the app: the dependency arrays here are
      // chosen, not derived, and a rule that is wrong often enough to ignore
      // trains people to ignore the ones that are right.
      'react-hooks/exhaustive-deps': 'off',

      /* A COMPONENT MAY NOT ASK WHAT IT IS RUNNING INSIDE. `process` and
         `__dirname` do not exist in the browser this is shipped to, and a
         bundler that happens to shim one is a bundler the next consumer may
         not be using. This is the one rule here the app does not have, and it
         is the one that is about being a library. */
      'no-restricted-globals': ['error', 'process', '__dirname', 'require'],

      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  {
    files: ['scripts/**/*.mjs', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
]
