<!--
Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
SPDX-License-Identifier: BSD-3-Clause
-->

# AudioReach Creator UI

[![License](https://img.shields.io/badge/License-BSD--3--Clause-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.26.0-orange.svg)](https://pnpm.io/)

> An open-source, cross-platform desktop application for designing, visualizing, and managing AudioReach audio processing graphs and use cases.

---

## ⚠️ Development Status

**This project is currently in early development and is being open-sourced to provide transparency into our progress.**

The application is not yet feature-complete or production-ready. We are actively developing core functionality and establishing the architectural foundation.

**Current Status:**

- ✅ Core architecture and design patterns established
- ✅ Monorepo structure with clean separation of concerns
- ✅ Feature-Sliced Design architecture implemented
- ✅ Visual graph designer foundation in place
- 🚧 Use case management features under active development
- 🚧 Device connectivity and real-time tuning in progress
- 📋 Comprehensive roadmap to be published

**Contributions:** We are not currently accepting external contributions. Contribution guidelines will be made available once we reach Milestone 1. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Backend Integration](#backend-integration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
- [License](#license)
- [Code of Conduct](#code-of-conduct)

---

## Overview

AudioReach Creator UI is a modern desktop application built with Electron and React that provides a visual interface for designing and managing AudioReach audio processing graphs. It serves as the frontend companion to the [AudioReach Creator API](https://github.com/AudioReach/audioreach-creator-api), enabling developers and audio engineers to create sophisticated audio processing pipelines through an intuitive graphical interface.

### What is AudioReach?

AudioReach is Qualcomm's next-generation audio framework that provides a flexible, modular approach to audio processing. This UI application enables users to work with AudioReach configurations visually, making it easier to design, test, and deploy audio processing solutions.

**Learn More About AudioReach:**

- **[AudioReach GitHub Organization](https://github.com/AudioReach/)** - Explore the complete AudioReach ecosystem including engine, kernel drivers, and platform adaptations
- **[AudioReach Documentation](https://audioreach.github.io/sdk_overview.html)** - Comprehensive SDK overview, architecture details, and development workflow guides
- **[AudioReach Creator API](https://github.com/AudioReach/audioreach-creator-api)** - Backend REST API for managing AudioReach database files

### Project Vision

The AudioReach Creator UI aims to provide:

- **Visual Graph Designer**: Intuitive drag-and-drop interface for building audio processing graphs
- **Use Case Management**: Create, edit, and organize audio use cases
- **Real-Time Visualization**: View and understand complex audio processing pipelines
- **Device Connectivity**: Connect to devices for real-time monitoring and parameter tuning
- **Configuration Management**: Manage module configurations and parameters
- **Validation & Testing**: Validate audio graphs and simulate use cases
- **Cross-Platform Support**: Run on Windows, Linux, and macOS

---

## Key Features

### Current Capabilities

- **Electron + React Architecture**
  - Cross-platform desktop application
  - Modern React 19 with TypeScript
  - Type-safe IPC communication between main and renderer processes

- **Feature-Sliced Design**
  - Structured architecture for maintainability and scalability
  - Clear separation of concerns across layers
  - Modular and reusable components

- **Monorepo Structure**
  - Organized with pnpm workspaces
  - Shared utilities and type definitions
  - Independent package development and testing

- **Developer Experience**
  - Hot module reloading for rapid development
  - Comprehensive TypeScript type checking
  - ESLint and Prettier for code quality
  - Playwright for end-to-end testing

### Planned Features

- Complete visual graph designer with drag-and-drop
- Advanced use case management and organization
- Real-time device connectivity and monitoring
- Parameter tuning interface
- Graph validation and error reporting
- Use case simulation capabilities
- Export and import functionality
- Collaborative features

---

## Architecture

### Feature-Sliced Design Architecture

The React frontend is organized using [Feature-Sliced Design](https://feature-sliced.design/) architecture, which provides a structured approach to organizing code by its domain and purpose:

```
src/
├── entities/       # Business entities (projects, use cases, modules, etc.)
├── features/       # User interactions, processes, and features
├── widgets/        # Composite UI blocks combining entities and features
├── shared/         # Shared utilities, UI components, and libraries
└── pages/          # Application pages/screens (future)
```

#### Layers Explained

- **entities**: Core business logic and data models for domain objects
- **features**: User interactions and business processes (configurators, visualizers, etc.)
- **widgets**: Composite UI blocks that combine entities and features (panels, workspaces)
- **shared**: Reusable components, utilities, API clients, and libraries
- **pages**: Application screens that compose widgets and features

This architecture promotes:

- Clear separation of concerns
- Better code organization and discoverability
- Improved maintainability and scalability
- Easier onboarding for new developers
- Testable and modular code

### Monorepo Structure

The project uses a monorepo structure with [pnpm workspaces](https://pnpm.io/workspaces):

```
├── packages/
│   ├── api-utils/         # Shared types and utilities for IPC communication
│   ├── electron-app/      # Electron main process and preload scripts
│   ├── react-app/         # React frontend application
│   └── tsconfig/          # Shared TypeScript configurations
```

---

## Technology Stack

| Technology       | Version | Purpose                       |
| ---------------- | ------- | ----------------------------- |
| **Node.js**      | LTS     | Runtime environment           |
| **TypeScript**   | 5.8.3   | Programming language          |
| **React**        | 19      | UI framework                  |
| **Electron**     | 37+     | Desktop application framework |
| **Vite**         | 7       | Frontend build tool           |
| **ESBuild**      | Latest  | Electron bundling             |
| **Zustand**      | Latest  | State management              |
| **QUI React**    | Latest  | Qualcomm UI component library |
| **Tailwind CSS** | Latest  | Utility-first CSS framework   |
| **pnpm**         | 10.26.0 | Package manager               |
| **Turbo**        | Latest  | Monorepo build orchestration  |
| **Playwright**   | Latest  | End-to-end testing            |
| **Jest**         | Latest  | Unit testing framework        |
| **ESLint**       | 9.31.0  | Code linting                  |
| **Prettier**     | 3.6.2   | Code formatting               |

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** LTS version ([Download](https://nodejs.org/))
- **pnpm** 10.26.0 (Install via Corepack - see below)
- **Git** ([Download](https://git-scm.com/))

### Installing pnpm via Corepack

We recommend using Corepack to install pnpm to ensure the correct version:

```bash
# Enable Corepack (included with Node.js ≥16.10)
corepack enable pnpm

# Corepack will automatically use the version specified in package.json
```

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/AudioReach/audioreach-creator-ui.git
cd audioreach-creator-ui

# Install dependencies
pnpm install

# Build all packages (required for first-time setup)
pnpm build
```

### Running the Application

#### Development Mode

To start the application in development mode with hot reloading:

```bash
# Start both React dev server and Electron app
pnpm dev
```

This command:

1. Starts the React development server with hot module reloading
2. Builds and watches the Electron app
3. Launches the Electron application connected to the React dev server

#### Development Scripts

```bash
# Start only the React development server
pnpm dev:ui

# Start only the Electron app
pnpm dev:electron

# Run TypeScript type checking
pnpm typecheck
```

### Building and Bundling

#### Building the Application

To build the application without creating distributable packages:

```bash
pnpm build
```

This command:

1. Cleans the output directories
2. Builds the api-utils package
3. Builds the React frontend
4. Builds the Electron app

#### Bundling for Distribution

To create distributable packages:

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

**Note:** Binaries built for Windows need to be built on a Windows device.

---

## Backend Integration

AudioReach Creator UI communicates with the [AudioReach Creator API](https://github.com/AudioReach/audioreach-creator-api) backend server to manage AudioReach database files and perform audio graph operations.

### Setting Up the Backend

1. **Install and run the AudioReach Creator API:**

   ```bash
   # In a separate terminal, clone and start the backend
   git clone https://github.com/AudioReach/audioreach-creator-api.git
   cd audioreach-creator-api
   yarn install
   yarn build
   yarn start:dev
   ```

   The API server will start on `http://localhost:3000` by default.

2. **Configure the UI to connect to the backend:**

   The UI sends HTTP requests to the backend API running on localhost. Ensure the backend server is running before starting the UI application.

### API Communication

- The UI communicates with the backend via REST API calls
- All API requests are sent to the configured backend port (default: 3000)
- The backend handles file parsing, database operations, and graph management
- The UI provides the visual interface and user interactions
- Check **[HTTP Communication](docs/ArchitectureOverview.md#2-http-communication)** for call flow.

---

## Project Structure

```
audioreach-creator-ui/
├── packages/
│   ├── api-utils/              # Shared types and utilities
│   │   ├── src/
│   │   │   ├── api.ts          # API type definitions
│   │   │   ├── index.ts        # Public exports
│   │   │   └── project-file-api.types.ts
│   │   └── package.json
│   │
│   ├── electron-app/           # Electron main process
│   │   ├── src/
│   │   │   ├── main.ts         # Electron main process entry
│   │   │   ├── preload.ts      # Preload script for IPC
│   │   │   └── project-file-api.ts
│   │   ├── installer/          # Installation scripts
│   │   ├── tests/              # E2E tests
│   │   └── package.json
│   │
│   ├── react-app/              # React frontend application
│   │   ├── src/
│   │   │   ├── entities/       # Business entities
│   │   │   │   ├── key-configurator/
│   │   │   │   ├── key-definitions/
│   │   │   │   ├── module-definitions/
│   │   │   │   ├── project/
│   │   │   │   └── usecases/
│   │   │   │
│   │   │   ├── features/       # User interactions and features
│   │   │   │   ├── device-list/
│   │   │   │   ├── device-operations/
│   │   │   │   ├── key-configurator/
│   │   │   │   ├── log-view/
│   │   │   │   ├── module-list/
│   │   │   │   ├── open-file/
│   │   │   │   ├── project-operations/
│   │   │   │   ├── recent-projects/
│   │   │   │   ├── subsystem-browser/
│   │   │   │   ├── usecase-selection/
│   │   │   │   ├── usecase-visualizer/
│   │   │   │   └── validation-result-view/
│   │   │   │
│   │   │   ├── widgets/        # Composite UI blocks
│   │   │   │   ├── configurator-panel/
│   │   │   │   ├── editor-shell/
│   │   │   │   ├── graph-designer/
│   │   │   │   ├── key-configurator-panel/
│   │   │   │   ├── properties-panel/
│   │   │   │   ├── session-workspace/
│   │   │   │   └── start-page/
│   │   │   │
│   │   │   ├── shared/         # Shared utilities and components
│   │   │   │   ├── api/        # API clients
│   │   │   │   ├── config/     # Configuration
│   │   │   │   ├── controls/   # Reusable UI controls
│   │   │   │   ├── layout/     # Layout components
│   │   │   │   ├── lib/        # Utility libraries
│   │   │   │   ├── providers/  # Context providers
│   │   │   │   ├── store/      # State management
│   │   │   │   ├── types/      # TypeScript types
│   │   │   │   └── utils/      # Utility functions
│   │   │   │
│   │   │   ├── main.tsx        # Application entry point
│   │   │   └── index.css       # Global styles
│   │   │
│   │   ├── tests/              # Unit and integration tests
│   │   └── package.json
│   │
│   └── tsconfig/               # Shared TypeScript configurations
│       ├── tsconfig.build-types.json
│       ├── tsconfig.strict.json
│       └── tsconfig.typedoc.json
│
├── docs/                       # Documentation
│   ├── ArchitectureOverview.md
│   ├── api/
│   └── patterns/
│
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── package.json                # Root package configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── turbo.json                  # Turbo build configuration
└── tsconfig.json               # Root TypeScript configuration
```

### Package Descriptions

- **`api-utils`**: Shared TypeScript types and utilities for IPC communication between Electron main and renderer processes
- **`electron-app`**: Electron main process, preload scripts, and native desktop integration
- **`react-app`**: React frontend application with Feature-Sliced Design architecture
- **`tsconfig`**: Shared TypeScript configuration files for consistent type checking across packages

---

## Development

### Available Scripts

```bash
# Build all packages
pnpm build

# Build specific package
pnpm api-utils build
pnpm electron-app build
pnpm react-app build

# Start development server
pnpm dev                    # Start both React and Electron
pnpm dev:ui                 # Start only React dev server
pnpm dev:electron           # Start only Electron app

# Run tests
pnpm test                   # Run all tests
pnpm test:ci                # Run tests in CI mode

# Code quality
pnpm lint                   # Run ESLint
pnpm lint:fix               # Fix linting issues
pnpm format                 # Format code with Prettier
pnpm format:check           # Check code formatting

# Type checking
pnpm typecheck              # Run TypeScript type checking

# Clean build artifacts
pnpm clean

# Create distributable packages
pnpm bundle                 # Build and package for distribution
pnpm release                # Create release builds
```

### Development Workflow

1. **Make Changes**: Edit files in the appropriate package
2. **Build**: Run `pnpm build` to compile TypeScript (or use `pnpm dev` for hot reloading)
3. **Test**: Run tests to verify changes
4. **Lint**: Ensure code quality with `pnpm lint`
5. **Format**: Format code with `pnpm format`
6. **Type Check**: Verify types with `pnpm typecheck`

### IPC Communication

The application uses a type-safe IPC communication system between the Electron main process and React renderer process:

- `api-utils` package defines shared types and interfaces
- `preload.ts` exposes a secure API to the renderer process
- TypeScript discriminated unions ensure type safety across processes

Example usage in renderer process:

```typescript
// Send request to main process
const response = await window.api.send({
  requestType: ApiRequest.OpenFile,
  data: {filePath: '/path/to/file'},
});
```

---

## Testing

The application includes comprehensive testing with Playwright for end-to-end tests and Jest for unit tests.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm electron-app test
pnpm react-app test

# Run tests in CI mode
pnpm test:ci

# Run E2E tests with Playwright
pnpm electron-app test:e2e
```

### Test Structure

- **E2E Tests**: Located in `packages/electron-app/tests/` - Test complete user workflows
- **Unit Tests**: Located in `packages/react-app/tests/` - Test individual components and functions
- **Integration Tests**: Test interactions between components and features

---

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Architecture Overview](docs/ArchitectureOverview.md)**: Detailed architecture documentation
- **API Documentation**: API reference and integration guides
- **Patterns**: Design patterns and best practices

For backend API documentation, see the [AudioReach Creator API repository](https://github.com/AudioReach/audioreach-creator-api).

---

## License

This project is licensed under the **BSD-3-Clause License**. See the [LICENSE](LICENSE.txt) file for details.

---

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

---

## Acknowledgments

AudioReach Creator UI is built with modern software engineering practices and leverages the excellent work of the open-source community. Special thanks to the AudioReach team and all contributors to the technologies that make this project possible.
