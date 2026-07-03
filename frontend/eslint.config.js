import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "root", pattern: "src/*" },
        { type: "app", pattern: "src/app/**" },
        { type: "feature", pattern: "src/features/*/index.ts" },
        { type: "feature-api", pattern: "src/features/*/api/**" },
        { type: "feature-model", pattern: "src/features/*/model/**" },
        { type: "feature-hooks", pattern: "src/features/*/hooks/**" },
        { type: "feature-ui", pattern: "src/features/*/ui/**" },
        { type: "feature-internal", pattern: "src/features/*/**" },
        { type: "shared", pattern: "src/shared/**" },
      ],
      "boundaries/include": ["src/**/*"],
      "boundaries/ignore": ["src/**/*.test.*", "src/**/*.spec.*"],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      "boundaries/element-types": ["error", {
        default: "disallow",
        rules: [
          { from: "root", allow: ["app", "feature", "shared"] },
          { from: "app", allow: ["root", "app", "feature", "shared"] },
          { from: "feature", allow: ["feature", "feature-api", "feature-model", "feature-hooks", "feature-ui", "shared"] },
          { from: "feature-api", allow: ["feature-api", "shared"] },
          { from: "feature-model", allow: ["feature-api", "feature-model", "shared"] },
          { from: "feature-hooks", allow: ["feature-api", "feature-model", "feature-hooks", "shared"] },
          { from: "feature-ui", allow: ["feature-model", "feature-hooks", "feature-ui", "shared"] },
          { from: "feature-internal", allow: ["feature", "feature-api", "feature-model", "feature-hooks", "feature-ui", "feature-internal", "shared"] },
          { from: "shared", allow: ["shared"] },
        ],
      }],
    },
  },
)
