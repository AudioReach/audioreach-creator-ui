# Desktop Distribution: Backend Installation Design

**Date:** 2026-08-28
**Status:** Approved in conversation; pending written-spec review

**Requirements:** [Desktop Distribution Requirements](../requirements/desktop-distribution-requirements.md)

## 1. Purpose and Scope

This design makes the AudioReach Creator backend consumable as a reliable local desktop service. It
defines the backend runtime, health supervisor, endpoint-discovery contract, and release artifact
that a separate product-installer owner combines with the Electron application.

The first release is per-user, single-user, and local-only. Remote/multi-user deployment,
authentication, TLS, and real-time device services remain deferred. The design preserves extension
points for those later additions.

## 2. Architectural Decisions

### ADR-1: Per-user supervisor plus OS startup registration

Add a Node-specific `@arc/desktop-supervisor` package. The OS starts it after user login; it starts
and monitors the API as a child process. Windows Task Scheduler, macOS LaunchAgent, and Linux
`systemd --user` keep the supervisor alive.

OS restart alone does not reliably detect a process that is alive but unhealthy. Electron ownership
would violate independent client lifetimes. Docker and third-party process-management daemons add
unnecessary customer prerequisites. The supervisor stays outside `@arc/core` and has no domain logic.

### ADR-2: Node runtime payload instead of a Node single executable

Publish one target-specific folder containing a matching Node.js 22 executable, compiled JavaScript,
production dependencies, migrations, the supervisor, and a manifest. The installer consumes this
artifact unchanged.

Customer-installed Node.js does not meet the single-install goal. A Node single executable makes
ESM and native `sqlite3` packaging high risk. Manual copying is not reproducible.

### ADR-3: Separate distribution assembly project

A thin distribution project or release pipeline pins compatible Electron and backend artifacts,
validates their manifests, and produces platform packages. Neither application repository imports
the other or embeds its source tree.

### ADR-4: Multi-service supervisor extension point

The supervisor reads an installed service manifest. The first-release manifest contains only
`offline-api`. Future entries may declare a command, health URL, restart policy, dependencies, and
log target without changing the supervisor process contract.

## 3. Component Ownership

```text
Per-user OS startup registration
  -> @arc/desktop-supervisor
       -> @arc/api (offline API; one service in release 1)
            -> SQLite, config, endpoint record, logs

Electron / MATLAB / other same-computer clients
  -> read endpoint record
  -> call loopback API
```

| Component | Owner | Responsibility |
|---|---|---|
| `@arc/core` | Existing core team | No installation changes; it remains framework- and Node-free. |
| `@arc/api` | Backend team | Runtime configuration, loopback startup, migrations, health, endpoint discovery, graceful shutdown, file logging. |
| `@arc/desktop-supervisor` | Backend team | Child lifecycle, single-instance coordination, health polling, restart policy, diagnostics, service manifest. |
| Runtime packaging scripts | Backend team | Assemble and verify a relocatable backend runtime artifact. |
| Distribution assembly | Installer owner | Combine signed Electron/backend artifacts and produce platform packages. |
| OS startup descriptors | Installer owner | Register the supervisor command for one user. |
| Electron connection layer | Frontend team | Read discovery, call health, retry, invoke ensure-running, reveal logs. |

Electron is never a parent of the backend. The backend never starts Electron. The supervisor is the
only normal parent process of the backend.

## 4. Runtime Data and Configuration

The API owns a configurable per-user data root. The default preserves the current
database-path.ts behavior:

| OS | Default data root |
|---|---|
| Windows | %LOCALAPPDATA%/audioreach-creator |
| macOS | ~/Library/Application Support/audioreach-creator |
| Linux | ~/.local/share/audioreach-creator |

ConfigService supplies the database path. ARC_DATA_DIR is the documented absolute-directory
override. The API creates all required directories before SQLite starts and never writes mutable
state under the installed application directory.

    <data-root>/
      database.db
      config.json
      runtime/
        endpoint.json
        supervisor.lock/
      logs/
        api.jsonl
        supervisor.jsonl

config.json stores non-secret user settings, including an optional preferred port. endpoint.json
is runtime state and is not user-editable configuration.

| Setting | Default | Rule |
|---|---|---|
| ARC_DATA_DIR | OS data root | Absolute writable per-user directory. |
| ARC_BIND_HOST | 127.0.0.1 | Only 127.0.0.1 and optional ::1 are accepted. Other hosts fail startup. |
| ARC_PORT | 0 | Zero selects a free loopback port. A configured positive port is attempted first. |
| ARC_SERVICE_ID | offline-api | Identifies the launched service in logs and the manifest. |

The published base URL uses 127.0.0.1 to give all clients one predictable address. An optional IPv6
loopback listener must never expose a non-loopback address.

### 4.1 Loopback Address and Port

A loopback address identifies the same computer that is running the client. In the URL
`http://127.0.0.1:43123`, `127.0.0.1` means "this computer" and `43123` is the port number used to
select the AudioReach API process on that computer. Electron, MATLAB, and other local clients use
the full address to reach the backend.

The port is not a network-exposure mechanism: binding the API to the loopback address is what
prevents other computers on the LAN from connecting. The backend may choose a different available
port after startup; clients learn the current full URL from endpoint.json rather than assuming a
fixed port.

### 4.2 Endpoint-Discovery Contract

The API publishes the endpoint only after readiness. It writes a temporary file in the same runtime
directory, flushes it, then atomically renames it to endpoint.json. Readers see either the prior valid
record or the complete replacement.

    {
      "schemaVersion": 1,
      "apiBaseUrl": "http://127.0.0.1:43123"
    }

The record contains no token, secret, process ID, or network-reachable address. Clients reread it
after a connection failure. A stale record after an ungraceful crash is replaced on the next ready
startup.

## 5. API Startup, Health, and Shutdown

### 5.1 Startup Sequence

1. The supervisor takes the per-user lock and starts the API with runtime configuration.
2. The API validates its bind host and creates the data, runtime, and log directories.
3. The API begins listening on loopback with readiness state starting.
4. It initializes TypeORM and runs migrations. This work moves out of a lifecycle hook that blocks
   the HTTP listener, allowing health to report non-ready while initialization runs.
5. On success, the API obtains its assigned port, sets readiness to ready, and atomically writes
   endpoint.json.
6. The supervisor receives a successful readiness response and begins periodic monitoring.

Port, data-directory, database, and migration failures produce structured diagnostics, publish no
new endpoint record, and exit nonzero.

### 5.2 Health Endpoints

Health is API infrastructure behavior. It does not dispatch CQRS messages or add Node/Nest imports
to @arc/core.

| Endpoint | Success condition | Failure behavior |
|---|---|---|
| GET /health/live | HTTP process can respond. | 503 only during terminal shutdown. |
| GET /health/ready | Data root available, SQLite initialized, migrations complete, API ready. | 503 with a non-secret state code while starting, failed, or shutting down. |

The server binds only loopback, so these endpoints are not reachable from other computers.

### 5.3 Graceful Shutdown

On SIGTERM, SIGINT, or a normal supervisor stop request, the API marks readiness as shutting_down,
stops accepting new HTTP work, closes TypeORM and worker resources, removes its current endpoint
record, and exits zero. Unexpected failures write diagnostics and exit nonzero. The API never
restarts itself; the supervisor owns recovery.

## 6. Local Supervisor

The installed supervisor manifest is read-only application content. Release 1 has one service:

    {
      "schemaVersion": 1,
      "services": [
        {
          "id": "offline-api",
          "command": "<runtime>/node/node",
          "arguments": ["<runtime>/app/node_modules/@arc/api/dist/main.js"],
          "readinessUrl": "endpoint.json + /health/ready",
          "dependsOn": []
        }
      ]
    }

Paths are relative to the runtime root so an upgrade can replace versioned runtime content without
changing source code. Future real-time services use the same definition format.

The ensure-running command acquires an atomic per-user directory lock. When a lock already exists,
it probes the published endpoint and returns successfully if the service is healthy. It starts
services in dependency order, waits for readiness with a finite timeout, and watches child exit plus
periodic readiness failures. A crash or sustained failure triggers stale-record cleanup and bounded
exponential-backoff restart. Repeated failures remain in supervisor.jsonl without spawning duplicate
APIs.

The supervisor uses Node child-process, filesystem, timer, and HTTP APIs. It does not need a
third-party process-management daemon. It never parses business logs or publishes endpoints; it uses
readiness status, child exit state, and timeouts only.

## 7. Backend Runtime Artifact

### 7.1 Output Layout

The backend release job produces one target-specific artifact with normal Node module resolution:

    arc-backend-runtime-<platform>-<arch>-<version>/
      node/
        node[.exe]
      app/
        node_modules/
          @arc/api/dist/main.js
          @arc/core/dist/
          @arc/fs/dist/
          @arc/persistence/dist/
          sqlite3/
          ...production dependencies...
      supervisor/
        dist/
        services.json
      runtime-manifest.json
      LICENSES/

runtime-manifest.json includes schema version, backend version, API compatibility version, Node
version, target platform/architecture, and SHA-256 file hashes. Distribution assembly validates the
manifest before combining it with an Electron artifact.

### 7.2 Packaging Scripts

Backend-owned paths are:

    packages/desktop-supervisor/
    scripts/package-backend-runtime.mjs
    scripts/verify-backend-runtime.mjs

Root package commands expose them as package:runtime and verify:runtime. The packaging script:

1. invokes the workspace build;
2. stages @arc/api with production workspace and external dependencies using pnpm deploy --prod;
3. ensures package allowlists include compiled dist, required package metadata, and migrations but
   exclude tests and source files from the runtime payload;
4. copies a configured target-matched Node.js 22 runtime and its license notices;
5. copies the compiled supervisor and service manifest;
6. generates a deterministic runtime manifest; and
7. invokes the verification script before creating the archive.

The target Node runtime is an explicit packaging input. The script does not silently use the CI
machine's global Node executable as the distributed runtime.

### 7.3 Native Dependencies and Target Builds

sqlite3 must match the bundled Node runtime ABI and target platform. Backend runtime artifacts are
built and smoke-tested on target-compatible CI runners:

| Artifact | Build/verification environment |
|---|---|
| Windows x64 | Windows x64 runner; additional smoke test on Qualcomm Windows through x64 emulation. |
| macOS x64 | Intel macOS runner. |
| macOS arm64 | Apple Silicon macOS runner. |
| Ubuntu x64 | Ubuntu 22.04 and Ubuntu 24.04 runners. |

The first release does not create a native Windows arm64 artifact.

## 8. Installer Integration Contract

The installer/release owner consumes a validated backend runtime archive and does not run pnpm,
compile TypeScript, or install arbitrary backend dependencies.

| OS | Installer responsibility | Supervisor registration |
|---|---|---|
| Windows | Place runtime and Electron app in a per-user application location. | Task Scheduler task at user login invoking the supervisor. |
| macOS | Install signed/notarized app and runtime through the native app flow. | Per-user LaunchAgent invoking the supervisor. |
| Ubuntu | Install a signed user-installable package/AppImage-style runtime. | Per-user systemd unit invoking the supervisor. |

The installer uses a stable supervisor entry path. An upgrade replaces versioned runtime content, then
asks the supervisor to perform a controlled backend restart. Data root contents are never replaced.
Uninstall retains data by default and removes it only when the user explicitly requests it.

The installer provides product signing and platform-specific signing/notarization. The backend
artifact provides hashes and version metadata; it does not replace installer signing.

## 9. Error Handling and Observability

| Condition | API behavior | Supervisor behavior | Client behavior |
|---|---|---|---|
| Data root unavailable | Log, remain non-ready, exit nonzero. | Back off and retry; retain diagnostics. | Show recoverable unavailable state and log location. |
| Migration failure | Log context, exit nonzero; do not publish endpoint. | Back off and retry; avoid duplicates. | Do not send workspace requests; surface health failure. |
| Port allocation failure | Log attempted port, exit nonzero. | Retry with an available port. | Reread record before reporting unavailable. |
| API crash | Write fatal diagnostics when possible, exit nonzero. | Restart child with bounded backoff. | Retry after discovery reread. |
| API hangs/non-ready | Health returns 503 or times out. | Restart after threshold. | Retry after endpoint refresh. |
| Supervisor crash | N/A | OS startup facility restarts supervisor. | Temporarily show unavailable state. |

The API continues to use the project's structured logger convention. A file-backed API logger writes
JSON lines to <data-root>/logs/api.jsonl; the supervisor writes supervisor.jsonl. Electron's support
action opens the log directory or creates a support export.

## 10. Verification Strategy

### 10.1 Backend Unit and Integration Tests

- Config resolution rejects non-loopback hosts and resolves data-root defaults/overrides.
- Data-root initialization creates parent directories before SQLite opens.
- Health state transitions return documented liveness/readiness status and do not expose secrets.
- Discovery writer performs atomic replacement and only publishes after readiness.
- Graceful shutdown closes resources and removes only the active endpoint record.
- DataSourceProvider migration success and failure are tested using SQLite fixtures.

### 10.2 Supervisor Process Tests

- Starts a fixture backend and observes readiness.
- Does not start a duplicate backend while a healthy supervisor owns the lock.
- Restarts after child exit and applies configured backoff.
- Restarts after a fixture returns sustained non-ready responses.
- Preserves diagnostics after repeated failures.
- Starts services in dependency order once a future multi-service fixture is introduced.

### 10.3 Runtime Artifact Smoke Tests

For every target artifact, verify-backend-runtime.mjs runs the bundled Node executable, not the CI
global Node. It verifies native sqlite3 loading, loopback-only binding, dynamic port discovery,
migration/readiness, supervisor crash recovery, graceful shutdown, and manifest hashes.

## 11. Requirement Alignment

| Requirement | Design coverage |
|---|---|
| FR-DD-01 to FR-DD-03 | ADR-2, ADR-3, Sections 7 and 8. |
| FR-DD-04 to FR-DD-06 | ADR-1, Sections 3, 5, and 6. |
| FR-DD-07 and FR-DD-08 | Sections 4.1, 4.2, 5.1, and 6. |
| FR-DD-09 to FR-DD-11 | Sections 4, 5, 6, 9, and 10. |
| FR-DD-12 and FR-DD-13 | Section 8. |
| FR-DD-14 | ADR-4 and Sections 3 and 6. |
| I1 to I5 | Sections 4.1, 5.3, 6, and 8. |
| NFR-DD-01 to NFR-DD-05 | ADRs, Sections 3, 7, 8, and 10. |

## 12. Explicit Deferrals

- Remote/multi-user deployment, authentication, authorization, TLS, and tenant isolation.
- A user-facing remote-server selector in Electron.
- Real-time device service implementation. The service manifest is the extension point only.
- In-product update download/installation.
- Native Windows arm64 runtime output.
- Linux support outside Ubuntu 22.04/24.04 LTS x64.

## 13. Rollout and Rollback

The first rollout uses a signed installer containing a compatible Electron/backend pair. The installer
preserves the per-user data root. Backend migrations run before readiness, so a failed migration
prevents clients from using a partially initialized runtime.

Rollback replaces application/runtime files with the previous signed package while retaining data.
Database migration reversibility follows the existing TypeORM migration policy. A release with an
irreversible migration requires an explicit recovery or export plan before shipping. The runtime
manifest records the installed backend version needed for support diagnosis.
