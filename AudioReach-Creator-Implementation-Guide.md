# AudioReach Creator - Implementation Guide

## Table of Contents

1. App Loading and Rendering Flow
2. Preload Script Bridge
3. React App Entry and Shell
4. Architecture Overview
5. Key Implementation Patterns

---

## 1. App Loading and Rendering Flow

AudioReach Creator is a hybrid desktop application built with Electron and React, following a monorepo structure with multiple packages for separation of concerns.

### Electron Main Process Initialization

File: packages/electron-app/src/main.ts

The app starts with the Electron main process.

- app.whenReady() triggers createWindow()
- Creates a BrowserWindow with:
  - width: 1550 (dev) / 1200 (prod)
  - height: 800
  - webPreferences.preload points to ./preload.cjs
- In development, the app loads the React dev server at http://localhost:5173
- In production, the app loads a local index.html from the bundled dist

### Development vs Production Loading

Development Mode (process.env.DEV is truthy):

- Uses a spinner (ora) and polls the React dev server for up to 60 seconds (120 attempts x 500ms).
- On success, loads the URL and opens DevTools.
- If the server doesn’t become ready in time, exits the process.

Production Mode:

- Loads a local index.html (await win.loadFile(${\_\_dirname}/index.html)) from the packaged dist folder.

### IPC Communication Setup

The main process registers a single IPC handler "ipc::message" (see packages/electron-app/src/main.ts), which supports multiple request types using the shared types from @audioreach-creator-ui/api-utils. Additional handlers support reading and writing a local config.json via load-config-data and save-config-data.

---

## 2. Preload Script Bridge

File: packages/electron-app/src/preload.ts

The preload script acts as a secure bridge between the Electron main process and the renderer (React app) using contextBridge. It exposes:

- api.send(request) → invokes ipc::message and returns typed responses
- api.versions → { chromeVersion, electronVersion, nodeVersion }

This makes a safe window.api available in the renderer.

---

## 3. React App Entry and Shell

File: packages/react-app/src/main.tsx

The React application is initialized without a router. The root renders an application shell (EditorShell) within the QUI design system root.

```tsx
import {createRoot} from "react-dom/client"
import {QuiRoot} from "@qui/react"
import {EditorShell} from "~widgets/editor-shell"
import "./index.css"

const App = () => (
  <QuiRoot>
    <EditorShell />
  </QuiRoot>
)

createRoot(document.getElementById("root")!).render(<App />)
```

Key points:

- No file-based or imperative routing is used currently.
- The shell composes top-level UI (widgets, features, layout).
- The renderer is bundled by Vite in production, served by the dev server in development.

HTML Template

- File: packages/react-app/index.html
- Contains a <div id="root"></div> where React mounts
- Loads the React entry (src/main.tsx)
- Includes fonts and basic meta

---

## 4. Architecture Overview

### Project Structure

```
packages/
├── electron-app/           # Electron main process (main.ts) and preload (preload.ts)
│   └── src/
├── react-app/              # React frontend
│   └── src/
│       ├── entities/       # Business entities and domain types
│       ├── features/       # Feature logic and UI
│       ├── shared/         # Shared api, config, controls, layout, store, theme, etc.
│       └── widgets/        # Composite UI (editor shell, start page, etc.)
└── api-utils/              # Shared API types for Electron↔Renderer
```

### Key Technologies

- Electron (desktop shell)
- React 19
- QUI React + Tailwind for UI
- Vite (frontend build/dev)
- esbuild (Electron bundling)
- Zustand (state)
- TypeScript (types across all packages)
- Playwright (end-to-end tests)

Note: The application previously referenced file-based routing and react-router, but the current implementation does not use @generouted/react-router or react-router-dom.

---

## 5. Key Implementation Patterns

### 1) Feature-Sliced Design (FSD)

- entities: Core business data and domain types
- features: User interactions and workflows
- widgets: Composite UI aggregating features/entities
- shared: Reusable UI, utils, configs

This structure improves maintainability, scalability, and discoverability.

### 2) State and Data Flow

- Lightweight state with Zustand (src/shared/store)
- Shared API types for IPC via @audioreach-creator-ui/api-utils
- Utilities for Electron API access in src/shared/api

### 3) Testing and CI

- Playwright for e2e of the Electron app
- Centralized timeouts/workers/retries in packages/electron-app/playwright.config.ts
- Turbo task graph enforces ordering:
  - test/test:ci depends on build (ensures dist readiness)
  - typecheck depends on ^typecheck (ensures upstream declaration availability without full builds)
- Electron tests launch using an absolute path to dist/main.cjs for deterministic startup

### 4) Build and Packaging

- React app built with Vite
- Electron main/preload bundled by esbuild via scripts/build.ts
- electron-builder packages application (files include dist/\*\* and package.json only)
- remove-binaries step strips ffmpeg binaries as needed

---

## Conclusion

This guide reflects the current architecture:

- Electron main handles app lifecycle and IPC.
- Preload exposes a safe API to the renderer.
- React app renders an EditorShell without routing, using a widget/feature/entity layered approach.
- Type safety is maintained across processes using shared types in api-utils.
- CI and tests are configured to avoid first-run flakiness and to keep typecheck independent of full builds.

Any previous references to @generouted/react-router or react-router-dom have been removed from the design and documentation to match the current implementation.
