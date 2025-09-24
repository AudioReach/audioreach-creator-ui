import tseslint from "typescript-eslint"

import quiEslintFsd from "@qui/eslint-config-fsd"
import quiEslintMdx from "@qui/eslint-config-mdx"
import quiEslintReact from "@qui/eslint-config-react"
import quiEslint from "@qui/eslint-config-typescript"

const fsdFileGlob = [
  "packages/react-app/src/entities/**/*.{ts,tsx}",
  "packages/react-app/src/features/**/*.{ts,tsx}",
  "packages/react-app/src/shared/**/*.{ts,tsx}",
  "packages/react-app/src/widgets/**/*.{ts,tsx}",
  "packages/react-app/src/pages/**/*.{ts,tsx}",
  "packages/react-app/src/data/**/*.{ts,tsx}",
]

const languageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    projectService: true,
  },
}

// Shared member ordering rule configuration
const memberOrderingRule = {
  "@typescript-eslint/member-ordering": [
    "error",
    {
      default: {
        memberTypes: [
          // Variables/fields first (grouped together)
          [
            "public-static-field",
            "protected-static-field",
            "private-static-field",
          ],
          [
            "public-instance-field",
            "protected-instance-field",
            "private-instance-field",
          ],
          ["public-abstract-field", "protected-abstract-field"],

          // Then constructors
          [
            "public-constructor",
            "protected-constructor",
            "private-constructor",
          ],

          // Then methods/functions (grouped together)
          [
            "public-static-method",
            "protected-static-method",
            "private-static-method",
          ],
          [
            "public-instance-method",
            "protected-instance-method",
            "private-instance-method",
          ],
          ["public-abstract-method", "protected-abstract-method"],
        ],
        order: "alphabetically-case-insensitive",
      },
    },
  ],
}

export default tseslint.config(
  {
    ignores: [
      ".aider.*",
      "**/.react-router/",
      "**/.turbo/",
      "**/build/",
      "**/coverage/",
      "**/dist/",
      "**/node_modules/",
      "**/out/",
      "**/vite.config.ts.timestamp*",
      "**/tests/",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        EventListenerOrEventListenerObject: true,
        FocusOptions: true,
        JSX: true,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      sourceType: "module",
    },
  },
  // fsd
  {
    extends: [quiEslintFsd.configs.publicApi],
    files: fsdFileGlob,
    languageOptions,
  },
  {
    extends: [quiEslintFsd.configs.layers, quiEslintFsd.configs.segments],
    files: fsdFileGlob,
    languageOptions,
  },
  {
    extends: [...quiEslint.configGroups.typeChecked],
    files: ["scripts/*.ts"],
    languageOptions,
  },

  // JS
  {
    extends: [quiEslint.configs.sortKeys, quiEslint.configs.styleGuide],
    files: ["packages/**/*.{jsx,js,mjs,cjs}", "*.{jsx,js,mjs.cjs}"],
  },

  // TS & React - Combined configuration with shared member ordering rule
  {
    extends: [
      ...quiEslint.configGroups.typeCheckedPerformance,
      quiEslintReact.configs.recommended,
    ],
    files: ["packages/**/*.{ts,tsx}"],
    languageOptions,
    rules: memberOrderingRule,
  },

  // mdx
  {
    extends: [quiEslintMdx.configs.recommended],
    files: ["packages/**/*.{md,mdx}", "*.md"],
  },
)
