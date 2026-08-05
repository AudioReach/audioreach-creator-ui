# AudioReach Creator UI — Claude Guidelines

## Working principles

- Be a pragmatic engineer who prioritizes correctness and clarity over agreeability
- Study existing patterns in the codebase before making changes — understand conventions before introducing new ones
- Be direct: provide one well-reasoned solution with concise justification, not a menu of options
- Understand requirements upfront — ask clarifying questions before starting non-trivial work
- Challenge technically poor assumptions rather than defaulting to agreement
- Consider security implications in all code, especially at system boundaries (user input, external APIs, IPC)

---

## Repo structure

Pnpm monorepo managed with Turbo. Four packages:

- `packages/react-app` — React frontend (Vite, TailwindCSS, Jest)
- `packages/electron-app` — Electron desktop shell wrapping react-app
- `packages/api-utils` — Shared DTO types and API utilities
- `packages/tsconfig` — Shared TypeScript configuration

Most development happens in `packages/react-app`.

Design docs, requirements, and implementation plans for features live under
`docs/design/<feature>/` and `docs/plans/<feature>/` respectively — check
there for context on any in-progress or past feature work.

---

## Architecture

Feature-Sliced Design (FSD). Layers in `src/` from most stable to most volatile:

- `entities/` — Domain models, DTOs, and API client functions
- `features/` — Self-contained feature slices
- `widgets/` — Compositions of multiple features
- `shared/` — Cross-cutting utilities, controls, stores, providers
- `data/` — Static data and seed files
- `assets/` — Static assets (images, icons)
- `pages/` — Reserved path alias for future top-level route pages; no directory exists yet

Each feature slice in `features/<name>/` typically follows this structure,
though not every feature has all four (e.g. a feature with no pure-utility
logic omits `lib/`; some have an additional `hooks/` folder for React hooks
that don't belong in `model/`):

```
model/        ← Zustand stores, types, coordinators
ui/           ← React components
lib/          ← Pure utility functions (no React, no stores)
index.ts      ← Public API — only export what consumers need
```

Upper layers may import from lower layers but not vice versa. Features must not import from other features directly — go through `shared/` or lift shared logic to `widgets/`.

---

## Naming

- Files: `kebab-case` (e.g. `module-list-store.ts`, `container-node.tsx`)
- Components: `PascalCase`
- Hooks: `camelCase` prefixed with `use` (e.g. `useModuleListStore`)
- Stores: `use<Feature>Store` (e.g. `useSearchComponentStore`)
- Types/interfaces: `PascalCase` with descriptive suffix (`*Store`, `*Props`, `*Dto`, `*Types`)
- DTO files: `*.dto.ts`

---

## TypeScript

- Strict mode is enabled — no `any`, no implicit returns, no unused locals
- Use `verbatimModuleSyntax`: import types with `import type`
- No `import React` needed (`react-jsx` transform)
- Path aliases with `~` prefix are required — no relative imports across layer boundaries:
  - `~features/*`, `~shared/*`, `~entities/*`, `~widgets/*`, `~pages/*`
- Prefer `async`/`await` over `.then()` chains
- Use named imports; avoid default imports where named imports are available

---

## State management

Zustand v5. One store per concern, scoped per project where state is per-project.

- New feature stores live in `features/<name>/model/use-<name>-store.ts`. Some existing cross-cutting stores live in `shared/store/` instead (e.g. project-scoped or global state not owned by one feature) — follow that precedent for state that isn't feature-local.
- Export the hook (`useXxxStore`) and any types from the feature `index.ts`
- Use selector functions to subscribe to only the slice of state needed — avoid subscribing to the whole store
- Zustand store state must be serializable — avoid storing `Set`, `Map`, or class instances; use plain arrays and objects
- Log meaningful state changes via `~shared/lib/logger` with action and component context

---

## Styling

- **Tailwind classes are the default** — use them for layout, spacing, typography, and borders
- **Inline `style` props** are only acceptable for values that cannot be expressed as static Tailwind classes (e.g. dynamic CSS variable references, calculated widths)
- **All colors must use QUI design token CSS variables** (e.g. `var(--color-border-support-info)`, `var(--color-background-neutral-02)`). Hardcoded hex or RGB values are not allowed in component code
- Do not use raw Tailwind color utilities (e.g. `text-red-500`) when a semantic QUI token exists for that purpose. Exception: the project's per-group color legend system (`tailwind.config.js`) intentionally defines a fixed palette of raw colors for dynamic per-project group coloring, where no semantic QUI token applies — don't flag usages of that palette
- Tailwind classes are auto-sorted by `prettier-plugin-tailwindcss` — do not manually reorder them

---

## Components

- **Use QUI (`@qualcomm-ui/react`) components** instead of native HTML elements wherever a QUI equivalent exists. Check available components and their API via the `qui-react` MCP server before reaching for a native element
- Native elements (`div`, `span`, `p`) are fine for layout and structural wrappers that have no QUI equivalent
- Icons: use `lucide-react`
- Graph visualization: `@xyflow/react` with ELK layout

---

## Comments

- All files must have the Qualcomm copyright header:

```ts
/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */
```

- Only write a comment when the **why** is non-obvious: a hidden constraint, a workaround for a specific bug, a subtle invariant, or behavior that would surprise a reader
- Do not write comments that restate what the code already says — well-named identifiers do that
- Do not write section-header comments (`// Handlers`, `// Derived state`) that add no information beyond what the code structure already shows
- One short line maximum — no multi-paragraph block comments
- JSDoc is appropriate for exported public API functions and interfaces

---

## Linting & formatting

**ESLint** (v9, flat config at repo root):

- Qualcomm configs applied: `typescript` (base, sortKeys, styleGuide, recommended, performance, strictExports), `react` (base, recommended)
- TypeScript-aware rules are enabled via `projectService`
- **Object keys are automatically sorted by the `sortKeys` rule** — do not manually reorder keys; let ESLint enforce the order
- All lint errors must be resolved before merging
- Run `pnpm lint` to check; some violations can be auto-fixed via `pnpm lint:fix`

**Prettier** (v3):

- `singleQuote: true` — single quotes in TS/JS, double quotes in JSX attributes
- `bracketSpacing: false` — `{foo}` not `{ foo }` in destructuring and object literals
- `trailingComma: 'all'` — trailing commas in all multi-line structures
- `semi: true`, `tabWidth: 2`, `printWidth: 80`
- Run `pnpm format` to auto-format all files

---

## Testing

- Tests live in `packages/react-app/tests/` and should mirror the `src/` structure
- Framework: Jest with `ts-jest`, React Testing Library, jsdom environment
- Test files: `*.test.ts` / `*.test.tsx`
- Mock `~shared/lib/logger` in tests to suppress log output
- Coverage threshold: 10% globally (branches, functions, lines, statements)
- Run `pnpm test` locally; CI runs `pnpm test:ci` (coverage + no watch mode)

### No console output in tests

`tests/test-setup.ts` fails any test that emits an unfiltered call to
`console.error`, `console.warn`, `console.debug`, `console.info`, or
`console.log`. The only allowlisted noise is the `ReactDOM.render is
deprecated` warning and qui prop-leak warnings on `console.error` (see
`QUI_PROP_LEAK_PATTERNS`); every other channel starts with an empty allowlist.
Anything reaching a guarded channel must be fixed at the source, not
tolerated:

- **Logger output** (`[ERROR]`/`[WARN]`/`[INFO]`/`[DEBUG]` from
  `~shared/lib/logger`) — add `jest.mock('~shared/lib/logger')` at the top of
  the suite, right after the SPDX header. Every suite that renders code
  paths which log needs this. The logger routes each level to its matching
  `console` channel, so a missing mock will fail via whichever channel the
  code path uses.
- **React DOM warnings from qui mocks** — the mock is forwarding a
  non-standard prop to a native element. Destructure the offending prop out
  (`fooProp: _fooProp,`) in the mock's factory so it never reaches the DOM.
- **Invalid HTML nesting** (e.g. `<button>` inside `<button>`) — the mock is
  using the wrong element for its click target. Use a `<div role="button">`
  instead when the mock's child may itself be interactive.
- **Stray `console.log` from debugging** — remove it before committing.
- **Legitimately unavoidable noise from a third-party library** — extend the
  matching channel's allowlist in `test-setup.ts` (or add a sibling filter)
  with a comment explaining why.

Never suppress noise by wrapping a console channel locally or by broadening
the global filter without justification — those are the paths that silently
rot the suite.

---

## Commit messages

Conventional commits enforced. Format: `type(scope): subject`

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Scopes: `electron`, `react`, `api-utils`, `workspace`, `docs`
  - `react` covers all work in `packages/react-app` regardless of which feature or
    widget is touched — keep scopes short so the header stays under 50 chars.
    Name the specific feature/widget in the commit body instead.
- Subject: imperative mood, lowercase, no trailing period, max 50 chars
- **All lines in the commit message (subject and body) must not exceed 72 characters** — GitHub Actions workflows parse commit messages and long lines cause failures
- **Commits must be signed off**: use `git commit -s` or add `Signed-off-by: Name <email>` manually to the commit body
- Example:

```
feat(react): add graph search with prefix syntax

Supports sg:, ss:, cnt:, mod: prefix scopes and default
(all-node) search. Ctrl+F opens the panel; Escape closes it.

Signed-off-by: Satya Krishna Pindiproli <satya@example.com>
```

---

## Code review checklist

The following are enforced during code review in addition to general correctness:

**UI / keyboard interactions**
- Interactive components must implement standard keyboard conventions for their type. For search bars: `Enter` → next match, `Shift+Enter` → previous match, `Escape` → close. Omitting standard shortcuts is a defect, not a "nice to have"

**QUI components**
- Flag any native HTML element that has a QUI equivalent. Use the `qui-react` MCP server to verify available components before accepting a native element

**Styling**
- Flag inline `style` props that should be Tailwind classes
- Flag hardcoded hex/RGB color values — all colors must come from QUI design token CSS variables

**Code reuse**
- If the same logic pattern appears across multiple files in the same diff, flag it for extraction into a shared utility in `lib/`
- If two functions are structurally identical except for a type cast, they should be merged or abstracted

**Comments**
- Flag any comment that restates what the code already says
- Flag section-header comments that provide no information beyond what the code structure already shows

---

## Claude Code setup

### Project skills

This project defines its own `brainstorming`, `writing-plans`,
`executing-plans`, and `commit` skills in `.ai/skills/`, symlinked into
`.claude/skills/`.

**Always use these project skills for brainstorming, writing plans, and
executing plans — do not use a same-named skill from any other plugin.**
Invoke them by plain name (`brainstorming`, `writing-plans`,
`executing-plans`) rather than any plugin-qualified name, even if one
appears in `/skills` or a skill listing.

### QUI React MCP server

The `qui-react` MCP server provides live component documentation and API lookup for
`@qualcomm-ui/react`. Setup instructions are at
[qui-ai.qualcomm.com/docs/mcp/setup](https://qui-ai.qualcomm.com/docs/mcp/setup).

Register the server for this project (requires a QUI AI API key from the team):

```sh
claude mcp add qui-react --scope local -- \
  npx -y mcp-remote https://qui-ai.qualcomm.com/mcp/react \
  --header "Authorization:Bearer <YOUR_QUI_AI_KEY>"
```

This writes to `~/.claude.json` (outside the repo) so the key is never committed.
Once registered, the `qui-react` tools are available in every Claude Code session
for this project.
