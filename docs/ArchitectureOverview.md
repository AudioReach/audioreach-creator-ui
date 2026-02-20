<!--
Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
SPDX-License-Identifier: BSD-3-Clause
-->

# AudioReach Creator UI - Architecture Overview

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Communication Patterns](#communication-patterns)
3. [Open File Flow](#open-file-flow)
4. [Usecase Selection Flow](#usecase-selection-flow)
5. [Component Architecture](#component-architecture)
6. [API Layer Details](#api-layer-details)

## System Architecture

The AudioReach Creator UI follows a multi-process Electron architecture with a React frontend and a separate backend API server.

```mermaid
graph TB
    subgraph "Electron Application"
        subgraph "Main Process"
            MP[Main Process<br/>main.ts]
            PFA[Project File API<br/>project-file-api.ts]
            IPC[IPC Handlers]
        end

        subgraph "Renderer Process"
            subgraph "React Application"
                RC[React Components]
                PS[Project Service]
                EA[Electron API Bridge]
                HC[HTTP Client]
            end
        end

        PL[Preload Script<br/>preload.ts]
    end

    subgraph "Backend Services"
        API[Backend API Server<br/>localhost:3000/arc-api/v1]
        DB[(Database)]
    end

    subgraph "File System"
        FS[Local Files<br/>.awsp, .acdb]
    end

    MP <--> PL
    PL <--> EA
    RC --> PS
    PS --> EA
    PS --> HC
    HC --> API
    API --> DB
    MP --> FS
    PFA --> FS
```

### Key Components

- **Main Process**: Handles system-level operations, file dialogs, and native OS integration
- **Renderer Process**: React application providing the user interface
- **Preload Script**: Secure bridge exposing limited APIs to the renderer process
- **Backend API**: Separate Node.js server handling business logic and data persistence
- **File System**: Local project files (.awsp workspace files and .acdb database files)

## Communication Patterns

### 1. Inter-Process Communication (IPC)

The React app communicates with the Electron main process through a secure IPC bridge:

```mermaid
sequenceDiagram
    participant React as React Component
    participant EA as Electron API Bridge
    participant PL as Preload Script
    participant MP as Main Process

    React->>EA: electronApi.send(request)
    EA->>PL: window.api.send()
    PL->>MP: ipcRenderer.invoke("ipc::message")
    MP->>PL: Promise<ApiResponse>
    PL->>EA: ApiResponse
    EA->>React: ApiResponse
```

### 2. HTTP Communication

The React app communicates with the backend API through HTTP requests:

```mermaid
sequenceDiagram
    participant React as React Component
    participant PS as Project Service
    participant HC as HTTP Client
    participant API as Backend API

    React->>PS: Service Method Call
    PS->>HC: httpClient.get/post/patch()
    HC->>API: HTTP Request
    API->>HC: HTTP Response
    HC->>PS: ApiResult<T>
    PS->>React: Processed Result
```

## Open File Flow

This section details how clicking "Open File" flows through all the architectural layers.

### Complete Open File Sequence

```mermaid
sequenceDiagram
    participant User as User
    participant UI as React UI Component
    participant PS as ProjectService
    participant EA as ElectronApi
    participant MP as Main Process
    participant PFA as ProjectFileApi
    participant FS as File System
    participant HC as HttpClient
    participant API as Backend API

    User->>UI: Click "Open File"
    UI->>PS: ProjectService.openWorkspaceProjectFromFile()

    Note over PS: Step 1: Open File Dialog
    PS->>EA: electronApi.send(ApiRequest.OpenProjectFile)
    EA->>MP: IPC: "ipc::message"
    MP->>PFA: openProjectFile(win)
    PFA->>FS: dialog.showOpenDialog()
    FS-->>PFA: Selected file path
    PFA->>FS: readFileSync(.awsp file)
    PFA->>FS: readFileSync(.acdb file)
    PFA-->>MP: {workspaceFileData, acdbFileData, project}
    MP-->>EA: ApiResponse with file data
    EA-->>PS: File data response

    Note over PS: Step 2: Upload to Backend
    PS->>PS: Convert Buffer to File objects
    PS->>HC: openWorkspaceProject(acdbFile, workspaceFile)
    HC->>API: POST /projects/offline/upload-files
    API-->>HC: ProjectInfoResponseDto
    HC-->>PS: ApiResult<ProjectInfo>

    Note over PS: Step 3: Fetch Usecases
    PS->>PS: fetchUsecaseData(projectId)
    PS->>HC: getAllUsecases(projectId)
    HC->>API: GET /projects/{projectId}/usecases
    API-->>HC: UsecaseResponseDto[]
    HC-->>PS: Usecase data

    PS-->>UI: {success: true, project, usecaseData}
    UI->>UI: Update UI with project data
```

### Detailed Flow Breakdown

#### Phase 1: File Selection (Electron Layer)

1. **User Interaction**: User clicks "Open File" button in React UI
2. **Service Call**: React component calls `ProjectService.openWorkspaceProjectFromFile()`
3. **IPC Request**: Service sends `ApiRequest.OpenProjectFile` via Electron API
4. **File Dialog**: Main process shows native file picker dialog
5. **File Reading**: Reads both `.awsp` (workspace) and `.acdb` (database) files
6. **Response**: Returns file data and metadata to React

#### Phase 2: Backend Upload (HTTP Layer)

1. **File Conversion**: Convert Buffer data to File objects for upload
2. **API Call**: POST request to `/projects/offline/upload-files` with FormData
3. **Backend Processing**: Backend processes files and creates project
4. **Project Creation**: Returns project ID and metadata

#### Phase 3: Usecase Loading (HTTP Layer)

1. **Usecase Fetch**: GET request to `/projects/{projectId}/usecases`
2. **Data Mapping**: Transform DTOs to UI-friendly format
3. **State Update**: Store usecase data in application state

### Key Files Involved

| Layer               | File                                                                  | Responsibility                         |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| **React UI**        | `packages/react-app/src/entities/project/services/project-service.ts` | Orchestrates the entire flow           |
| **Electron API**    | `packages/react-app/src/shared/api/electron-api.ts`                   | IPC bridge to main process             |
| **Main Process**    | `packages/electron-app/src/main.ts`                                   | IPC handler routing                    |
| **File Operations** | `packages/electron-app/src/project-file-api.ts`                       | File dialog and file system operations |
| **Preload Bridge**  | `packages/electron-app/src/preload.ts`                                | Secure API exposure                    |
| **HTTP Client**     | `packages/react-app/src/shared/api/http-client.ts`                    | Backend communication                  |
| **Project API**     | `packages/react-app/src/entities/project/api/projects-api.ts`         | Project-specific API calls             |

## Usecase Selection Flow

After a project is opened, the system fetches and displays available usecases for selection.

### Usecase Data Flow

```mermaid
sequenceDiagram
    participant PS as ProjectService
    participant UA as UsecasesApi
    participant HC as HttpClient
    participant API as Backend API
    participant UC as UsecaseComponent
    participant Store as Zustand Store

    Note over PS: After project opens successfully
    PS->>PS: fetchUsecaseData(projectId)
    PS->>UA: getAllUsecases(projectId)
    UA->>HC: httpClient.get(`/projects/${projectId}/usecases`)
    HC->>API: GET /projects/{projectId}/usecases
    API-->>HC: UsecaseResponseDto[]
    HC-->>UA: ApiResult<UsecaseResponseDto[]>
    UA-->>PS: Usecase data
    PS->>PS: mapUsecaseDtoToCategories(data)
    PS-->>UC: Mapped usecase categories
    UC->>Store: Store usecase data
    UC->>UC: Render usecase selection UI
```

### Usecase Component Architecture

```mermaid
graph TB
    subgraph "Usecase Selection Feature"
        USC[UsecaseSelectionControl]
        ULP[UsecaseListPanel]
        Store[Zustand Store]
    end

    subgraph "Data Flow"
        API[Backend API]
        Mapper[Usecase Mapper]
        Categories[Usecase Categories]
    end

    API --> Mapper
    Mapper --> Categories
    Categories --> USC
    USC --> ULP
    USC <--> Store
    ULP <--> Store
```

### Usecase Selection Process

1. **Data Fetching**: After project opens, `ProjectService.fetchUsecaseData()` is called
2. **API Request**: Makes GET request to `/projects/{projectId}/usecases`
3. **Data Transformation**: Raw DTOs are mapped to UI-friendly category structure
4. **State Management**: Usecase data is stored in Zustand store by project ID
5. **UI Rendering**: `UsecaseSelectionControl` component displays searchable/filterable usecases
6. **User Interaction**: Users can search, expand categories, and select multiple usecases
7. **Selection Storage**: Selected usecases are persisted in the store for the current project

### Key Components

- **UsecaseSelectionControl**: Main component with search and dropdown functionality
- **UsecaseListPanel**: Renders the hierarchical list of usecases
- **useUsecaseStore**: Zustand store managing selected usecases per project
- **Usecase Mapper**: Transforms backend DTOs to frontend models

## Component Architecture

### Feature-Based Architecture

The React application follows a feature-based architecture with clear separation of concerns:

```mermaid
graph TB
    subgraph "React Application Structure"
        subgraph "Features"
            OF[open-file]
            US[usecase-selection]
            PO[project-operations]
            RP[recent-projects]
        end

        subgraph "Entities"
            PE[project/]
            UE[usecases/]
        end

        subgraph "Shared"
            API[api/]
            Store[store/]
            Utils[utils/]
            Controls[controls/]
        end

        subgraph "Widgets"
            ES[editor-shell]
            GD[graph-designer]
            SW[session-workspace]
        end
    end

    Features --> Entities
    Features --> Shared
    Widgets --> Features
    Widgets --> Entities
    Widgets --> Shared
```

### Layer Responsibilities

| Layer        | Purpose                                     | Examples                         |
| ------------ | ------------------------------------------- | -------------------------------- |
| **Features** | Business logic and UI for specific features | `open-file`, `usecase-selection` |
| **Entities** | Domain models and API integration           | `project`, `usecases`            |
| **Shared**   | Common utilities, stores, and components    | `api`, `store`, `controls`       |
| **Widgets**  | Complex composite components                | `editor-shell`, `graph-designer` |

## API Layer Details

### HTTP Client Architecture

The application uses a robust HTTP client with the following features:

```mermaid
graph TB
    subgraph "HTTP Client Features"
        HC[HttpClient]
        Retry[Retry Logic]
        Timeout[Timeout Handling]
        Error[Error Handling]
        Auth[Authentication]
    end

    subgraph "Backend Communication"
        Base[Base URL Resolution]
        Endpoints[API Endpoints]
        Response[Response Processing]
    end

    HC --> Retry
    HC --> Timeout
    HC --> Error
    HC --> Auth
    HC --> Base
    Base --> Endpoints
    Endpoints --> Response
```

### Key Features

1. **Base URL Resolution**: Configurable backend URL (defaults to `http://localhost:3000/arc-api/v1`)
2. **Retry Logic**: Exponential backoff with jitter for failed requests
3. **Timeout Handling**: Configurable request timeouts with AbortController
4. **Error Processing**: Unified error handling and response mapping
5. **Connection State**: Tracks backend availability and connection status

### API Endpoints Used

| Endpoint                                       | Method | Purpose                |
| ---------------------------------------------- | ------ | ---------------------- |
| `/projects`                                    | GET    | Fetch all projects     |
| `/projects/{projectId}`                        | GET    | Fetch specific project |
| `/projects/{projectId}/connect-to-project`     | PATCH  | Connect to project     |
| `/projects/offline/upload-files`               | POST   | Upload workspace files |
| `/projects/{projectId}/usecases`               | GET    | Fetch project usecases |
| `/projects/{projectId}/usecases/getComponents` | POST   | Get usecase components |

### Error Handling Strategy

```mermaid
flowchart TD
    Request[HTTP Request]
    Success{Success?}
    ServerError{5xx Error?}
    Retry{Retries Left?}
    BackoffWait[Exponential Backoff]
    MarkUnavailable[Mark Backend Unavailable]
    Return[Return Result]

    Request --> Success
    Success -->|Yes| Return
    Success -->|No| ServerError
    ServerError -->|Yes| Retry
    ServerError -->|No| Return
    Retry -->|Yes| BackoffWait
    Retry -->|No| MarkUnavailable
    BackoffWait --> Request
    MarkUnavailable --> Return
```

The HTTP client implements sophisticated error handling:

- **Network Errors**: Automatic retries with exponential backoff
- **Server Errors (5xx)**: Retries with backend availability tracking
- **Client Errors (4xx)**: Immediate failure without retries
- **Timeouts**: Configurable timeout with AbortController

This architecture ensures robust communication between the frontend and backend while providing excellent user experience through proper error handling and retry mechanisms.
