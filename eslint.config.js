import {defineConfig} from "eslint/config"
import * as tseslint from "typescript-eslint"

import quiEslintFsd from "@qualcomm-ui/eslint-config-fsd"
import quiEslintMdx from "@qualcomm-ui/eslint-config-mdx"
import quiEslintReact from "@qualcomm-ui/eslint-config-react"
import quiEslintTs from "@qualcomm-ui/eslint-config-typescript"
import quiEslintPluginReact from "@qualcomm-ui/eslint-plugin-react"

const tsLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    projectService: true,
  },
}

/**
 * @param relativePkgPath {string} relative path to the fsd directory from the source root.
 *
 * @example
 * ```js
 * makeFsdConfig("packages/community-extension/src")
 * makeFsdConfig("packages/tools/layout-checker")
 * ```
 */
function makeFsdConfig(relativePkgPath) {
  const fileGlob = [`${relativePkgPath}/**`]
  return [
    {
      extends: [quiEslintFsd.configs.publicApi],
      files: fileGlob,
    },
    {
      extends: [quiEslintFsd.configs.layers, quiEslintFsd.configs.segments],
      files: fileGlob,
      languageOptions: tsLanguageOptions,
      settings: {
        "import/resolver": {
          typescript: {
            alwaysTryTypes: true,
            project: `./${relativePkgPath}/tsconfig.json`,
          },
        },
      },
    },
  ]
}

const eslintConfig = defineConfig([
  {
    ignores: [
      "**/dist/",
      "**/node_modules/",
      "**/build/",
      "**/coverage/",
      "**/.turbo/",
      "**/out/",
      "**/out-tsc/",
      "**/temp/",
      "**/.react-router/",
    ],
  },
  // JS
  {
    extends: [
      quiEslintTs.configs.base,
      quiEslintTs.configs.sortKeys,
      quiEslintTs.configs.styleGuide,
    ],
    // recommendation: scope these to your source files in your package(s).
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
  },
  // TS
  {
    extends: [
      ...quiEslintTs.configs.recommended,
      quiEslintTs.configs.performance,
      quiEslintTs.configs.strictExports,
    ],
    // recommendation: scope these to your source files in your package(s).
    files: ["**/*.ts"],
    languageOptions: tsLanguageOptions,
  },
  // React
  {
    extends: [
      ...quiEslintTs.configs.recommended,
      quiEslintTs.configs.performance,
      quiEslintReact.configs.base,
      quiEslintReact.configs.recommended,
      // optional: include the plugin as well
      quiEslintPluginReact.config,
    ],
    // recommendation: scope these to your source files in your package(s).
    files: ["**/*.{ts,tsx}"],
    languageOptions: tsLanguageOptions,
    rules:{
      "react/prop-types": "off", // TypeScript provides type checking
    }
  },
  // Markdown
  {
    extends: [quiEslintMdx.configs.recommended],
    files: ["**/*.{md,mdx}", "*.md"],
  },
  // FSD (Feature-Sliced Design) Architecture Rules
 // ...makeFsdConfig("packages/react-app/src"),
])

export default eslintConfig
