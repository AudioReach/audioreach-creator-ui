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

  // TS
  {
    extends: [...quiEslint.configGroups.typeCheckedPerformance],
    files: ["packages/**/*.ts"],
    languageOptions,
  },

  // react
  {
    extends: [
      ...quiEslint.configGroups.typeCheckedPerformance,
      quiEslintReact.configs.recommended,
    ],
    files: ["packages/react-app/**/*.{ts,tsx}"],
    languageOptions,
  },

  // mdx
  {
    extends: [quiEslintMdx.configs.recommended],
    files: ["packages/**/*.{md,mdx}", "*.md"],
  },
)
