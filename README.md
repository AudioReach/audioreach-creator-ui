<!--
Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
SPDX-License-Identifier: BSD-3-Clause
-->

# AudioReach Creator using React Frontend and Electron

A cross-platform application to design, view and edit audio and voice use cases using AudioReach Engine.

## Technologies Used

- [React](https://react.dev/) 19
- [Electron](https://www.electronjs.org/) 37+
- [TypeScript](https://www.typescriptlang.org/) 5.7
- [QUI React](https://react.qui.qualcomm.com/) and [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) 7 for frontend bundling
- [ESBuild](https://esbuild.github.io/) for Electron bundlingret
- [Zustand](https://zustand-demo.pmnd.rs/) for state management (may change)
- [Playwright](https://playwright.dev) for e2e testing
- ESLint, Prettier, and Stylelint for code formatting

## Project Structure

This template follows a monorepo structure using [pnpm workspaces](https://pnpm.io/workspaces), organized into the following packages:

```
├── packages/
│   ├── api-utils/         # Shared types and utilities for IPC communication
│   ├── electron-app/      # Electron main process and preload scripts
│   ├── react-app/         # React frontend application
│   └── tsconfig/          # Shared TypeScript configurations
```

### Feature-Sliced Design Architecture

The React frontend is organized using [Feature-Sliced Design](https://feature-sliced.design/) architecture, which provides a structured approach to organizing code by its domain and purpose:

```
src/
├── entities/       # Business entities (users, products, etc.)
├── features/       # User interactions, processes, and features
├── pages/          # Application pages/screens
├── shared/         # Shared utilities, UI components, and libraries
└── widgets/        # Composite UI blocks combining entities and features
```

#### Layers Explained

- **entities**: Core business logic and data models
- **features**: User interactions and business processes
- **pages**: Application screens that compose widgets and features
- **shared**: Reusable components, utilities, and libraries
- **widgets**: Composite UI blocks that combine entities and features

This architecture promotes:

- Clear separation of concerns
- Better code organization and discoverability
- Improved maintainability and scalability
- Easier onboarding for new developers

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [pnpm](https://pnpm.io/) package manager

## Installation

### Setting Up pnpm

This project uses pnpm for package management. We recommend using [Corepack](https://pnpm.io/installation#using-corepack) to install the version specified in the root `package.json`:

```bash
# Enable Corepack (only needed once per Node.js installation)
corepack enable pnpm

# Install dependencies
pnpm install
```

If you encounter certificate issues during installation, check the [Troubleshooting](#troubleshooting) section below.

## Development Workflow

### Initial Build

If it's your first time starting the application (i.e., after a fresh clone), make sure to run:

```bash
pnpm build
```

### Starting the Development Server

To start the development server with hot reloading:

```bash
pnpm dev
```

This command:

1. Starts the React development server
2. Builds and watches the Electron app
3. Launches the Electron app connected to the React development server

### Development Scripts

- `pnpm dev`: Start both React and Electron in development mode
- `pnpm dev:ui`: Start only the React development server
- `pnpm dev:electron`: Start only the Electron app
- `pnpm typecheck`: Run TypeScript type checking

## Building and Bundling

### Building the Application

To build the application without bundling:

```bash
pnpm build
```

This command:

1. Cleans the output directories
2. Builds the api-utils package
3. Builds the React frontend
4. Builds the Electron app

### Bundling for Distribution

To bundle the application for distribution:

```bash
pnpm bundle
```

This command:

1. Builds all packages
2. Packages the application using electron-builder

The bundled application will be available in the `packages/electron-app/out` directory, with builds for:

- Windows (x64)
- macOS
- Linux (x64)

Note: Binaries built for Windows need to be built on a Windows device.

## IPC Communication

The template includes a type-safe IPC communication system between the Electron main process and the React renderer process:

- `api-utils` package defines shared types and interfaces
- `preload.ts` exposes a secure API to the renderer process
- TypeScript discriminated unions ensure type safety across processes

Example usage:

```typescript
// In renderer process
const response = await window.api.send({
  requestType: ApiRequest.CamelCase,
  data: {input: 'hello-world'},
});
```

## Testing

The template includes Playwright for end-to-end testing of the Electron application:

```bash
pnpm test
```

## Troubleshooting

If you encounter certificate issues during installation, you may need to configure npm to use a different certificate authority or disable strict SSL:

```bash
npm config set strict-ssl false
```

For other common issues, please refer to the [Electron documentation](https://www.electronjs.org/docs/latest/).
