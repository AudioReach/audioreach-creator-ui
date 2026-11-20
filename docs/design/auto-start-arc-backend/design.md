# Auto-Start AudioReach Creator Backend — Design

Requirements: [requirements.md](requirements.md)

**Status:** Approved
**Repos affected:** `audioreach-creator-ui` only (`packages/electron-app`, `packages/api-utils`)

## Overview

Three actors are involved: the Electron **main process**, the **splash renderer** (React + `@qualcomm-ui/react`, in its own `BrowserWindow`), and the **backend** process. The existing **main app renderer** (React) is involved only at the end of the sequence, for registration.

High-level flow on launch:

1. Main process opens the splash window and awaits its readiness before sending it anything.
2. Main process runs a connect sequence entirely within the main process: resolve the fixed installation layout → detect an already-healthy backend or spawn one → wait indefinitely for the backend's `config.json`, then `/health/live`, then `/health/ready` → create the main window hidden → register.
3. Once the backend is confirmed ready and the renderer registers successfully, the main process shows the main window and destroys the splash.
4. On any terminal error, or at any point before success, the splash shows a Quit button; there is no Retry — the only way to restart the sequence is relaunching the app.

Registration logic stays where it already lives (the renderer's `ensureRegistered()`); the main process only orchestrates _when_ that call happens.

## Distribution layout and path resolution

Per `docs/desktop-distribution-design.md`'s fixed-layout model (with `@arc/desktop-supervisor` and `endpoint.json` discovery explicitly out of scope for this feature), the installed application follows a fixed sibling-folder structure:

```text
<installation folder>/
  arc-backend/
    main.js
    ...
  arc-ui/
    <Electron app, including this client>
  app-data-config.json
```

`app-data-config.json` is created by the installer (out of scope for this feature) and is assumed to exist at launch:

```json
{"app-data": "c:\\xyz\\abc"}
```

Module `packages/electron-app/src/backend-lifecycle/installation-paths.ts`:

```ts
export function resolveInstallationFolder(): string {
  if (app.isPackaged) {
    return resolve(dirname(app.getPath('exe')), '..');
  }
  // Dev fallback: __dirname at runtime is packages/electron-app/dist.
  // Three levels up reaches the audioreach-creator-ui checkout root; a
  // fourth reaches its parent, where arc-backend/ and app-data-config.json
  // are placed as siblings of the checkout for local testing.
  return resolve(__dirname, '../../../..');
}

export function resolveArcBackendDir(): string {
  return resolve(resolveInstallationFolder(), 'arc-backend');
}

export function resolveArcBackendMainPath(): string {
  return join(resolveArcBackendDir(), 'main.js');
}

export function resolveAppDataConfigPath(): string {
  return join(resolveInstallationFolder(), 'app-data-config.json');
}
```

`resolveInstallationFolder()` assumes the running executable lives one level inside `<installation folder>` (in some folder, regardless of that folder's exact name) — the installer's precise packaging/naming mechanics are out of scope; only this runtime resolution rule is specified.

## Backend config reading

Module `packages/electron-app/src/backend-lifecycle/backend-config-reader.ts` reads two files, both owned by processes other than this client:

```ts
export interface AppDataConfig {
  /** Absolute path to <appData>/config.json */
  configJsonPath: string;
}

/** Reads and parses app-data-config.json. Returns null on any failure. */
export function readAppDataConfig(path: string): AppDataConfig | null { ... }

/**
 * Reads ARC_PORT from the backend's config.json. Returns null if the file
 * is missing, unparseable, or ARC_PORT is not a valid port number — this
 * is treated as "not yet written" (an expected, transient state during
 * startup), not an error.
 */
export function readBackendPort(configJsonPath: string): number | null { ... }
```

The backend's `config.json` (written by the backend itself, not this client) has the format:

```json
{"ARC_PORT": "3000"}
```

`readBackendPort`'s `null` return is deliberately not distinguished from "file doesn't exist yet" vs. "file is malformed" — both cases mean the same thing to the caller: keep waiting (during the post-spawn poll) or treat as absent (during the initial already-running check).

## Connect sequence orchestration (main process)

Module `packages/electron-app/src/backend-lifecycle/connect-orchestrator.ts`, exposing `runConnectSequence()`. Invoked once after the splash window has finished loading. There is no Retry — this is the only entry point into the sequence.

```ts
export interface ConnectDeps {
  backendBinaryExists: (path: string) => boolean;
  createHiddenMainWindow: () => void;
  notifyFailed: (reason: FailureReason, message: string) => void;
  notifyStatus: (phase: SplashPhase, message: string) => void;
  probeHealthy: (port: number) => Promise<boolean>;
  readBackendPort: (configJsonPath: string) => number | null;
  resolveAppDataConfig: () => AppDataConfig | null;
  resolveArcBackendDir: () => string;
  resolveBackendMainPath: () => string;
  showMainWindowAndCloseSplash: () => void;
  spawnBackend: (arcBackendDir: string) => void;
  waitForConfigFile: (path: string, intervalMs: number) => Promise<void>;
  waitForRegistrationResult: () => Promise<boolean>;
  waitUntilLive: (port: number, intervalMs: number) => Promise<void>;
  waitUntilReady: (port: number, intervalMs: number) => Promise<void>;
}
```

The 8-step sequence:

1. **Resolve `app-data-config.json`.** Missing/unparseable → terminal error `app-data-config-missing`, stop.
2. **Resolve `arc-backend/main.js`.** Missing → terminal error `backend-binary-missing`, stop.
3. **Check for an already-healthy backend.** If `<app-data>/config.json` exists and its `ARC_PORT` responds to a single-shot `probeHealthy` check, skip straight to step 6 (the ready-wait passes immediately since the backend is already live).
4. **Spawn** (only if step 3 didn't find a healthy backend). Detached, independent process, no `PORT` env var. If `spawnBackend` throws synchronously → terminal error `spawn-failed`, stop.
5. **Wait for `config.json`.** Poll its existence every 3s, indefinitely (`waitForConfigFile`), until it appears or the user quits.
6. **Wait for `/health/live`.** Once `config.json`'s port is known, poll `GET http://localhost:<port>/health/live` every 3s, indefinitely (`waitUntilLive`).
7. **Wait for `/health/ready`.** Poll `GET http://localhost:<port>/health/ready` every 5s, indefinitely (`waitUntilReady`).
8. **Register.** Create the hidden main `BrowserWindow`, wait for the renderer's registration handshake. `false` → terminal error `registration-failed`, stop. `true` → show the main window, close the splash.

```ts
export async function runConnectSequence(deps: ConnectDeps): Promise<void> {
  const appDataConfig = deps.resolveAppDataConfig();
  if (!appDataConfig) {
    deps.notifyFailed(
      'app-data-config-missing',
      'Installation configuration file not found or invalid. Please reinstall the application.',
    );
    return;
  }

  const backendMainPath = deps.resolveBackendMainPath();
  if (!deps.backendBinaryExists(backendMainPath)) {
    deps.notifyFailed(
      'backend-binary-missing',
      `AudioReach Creator backend not found at ${backendMainPath}. Please reinstall the application.`,
    );
    return;
  }

  deps.notifyStatus('starting', 'Checking for running backend...');

  const configPath = appDataConfig.configJsonPath;
  const existingPort = deps.readBackendPort(configPath);

  let port: number;

  if (existingPort !== null && (await deps.probeHealthy(existingPort))) {
    port = existingPort;
  } else {
    deps.notifyStatus('starting', 'Starting AudioReach Creator backend...');
    try {
      deps.spawnBackend(deps.resolveArcBackendDir());
    } catch {
      deps.notifyFailed(
        'spawn-failed',
        'Failed to start the AudioReach Creator backend process.',
      );
      return;
    }

    deps.notifyStatus('waiting-for-config', 'Waiting for backend to initialize...');
    await deps.waitForConfigFile(configPath, 3000);

    port = deps.readBackendPort(configPath) as number; // guaranteed present after the wait

    deps.notifyStatus('waiting-for-live', 'Waiting for backend to start...');
    await deps.waitUntilLive(port, 3000);
  }

  deps.notifyStatus('waiting-for-ready', 'Waiting for backend to become ready...');
  await deps.waitUntilReady(port, 5000);

  deps.createHiddenMainWindow();
  deps.notifyStatus('registering', 'Registering client...');
  const registered = await deps.waitForRegistrationResult();

  if (!registered) {
    deps.notifyFailed('registration-failed', 'Client registration failed.');
    return;
  }

  deps.showMainWindowAndCloseSplash();
}
```

`main.ts`'s `buildConnectDeps()` binds each method to the module functions shown throughout this document:

```ts
function buildConnectDeps(): ConnectDeps {
  return {
    backendBinaryExists: (path) => existsSync(path),
    createHiddenMainWindow: () => { void createWindow(false).then(() => createApplicationMenu()); },
    notifyFailed: sendSplashFailed,
    notifyStatus: sendSplashStatus,
    probeHealthy: (port) => probeHealthy(port),
    readBackendPort: (configJsonPath) => readBackendPort(configJsonPath),
    resolveAppDataConfig: () => readAppDataConfig(resolveAppDataConfigPath()),
    resolveArcBackendDir,
    resolveBackendMainPath: resolveArcBackendMainPath,
    showMainWindowAndCloseSplash: () => { win.show(); closeSplashWindow(); },
    spawnBackend: spawnBackendProcess,
    waitForConfigFile: (path, intervalMs) => waitUntilFileExists(path, intervalMs),
    waitForRegistrationResult: async () => true, // TODO: Plugin registration logic (pre-existing, out of scope)
    waitUntilLive: (port, intervalMs) => waitUntilHealthy(port, '/health/live', intervalMs),
    waitUntilReady: (port, intervalMs) => waitUntilHealthy(port, '/health/ready', intervalMs),
  };
}
```

## Spawning (main process)

Module `packages/electron-app/src/backend-lifecycle/backend-spawner.ts`:

```ts
export function buildBackendSpawnOptions(
  arcBackendDir: string,
  execPath: string = process.execPath,
): BackendSpawnOptions {
  return {
    args: [join(arcBackendDir, 'main.js')],
    command: execPath,
    options: {
      cwd: arcBackendDir,
      detached: true,
      env: {...process.env, ELECTRON_RUN_AS_NODE: '1', PROCESS_TITLE: 'ARC Backend'},
      stdio: 'ignore',
    },
  };
}

export function spawnBackendProcess(arcBackendDir: string): void {
  const {args, command, options} = buildBackendSpawnOptions(arcBackendDir);
  const child = spawn(command, args, options);
  child.unref();
}
```

- `process.execPath` + `ELECTRON_RUN_AS_NODE: '1'` runs the backend using Electron's bundled Node runtime, avoiding a dependency on a system-installed Node.
- **No `PORT` env var.** The backend chooses its own port and writes it to `config.json`; the client never dictates it.
- `detached: true` plus `child.unref()` give the child its own process group and prevent it from keeping the Electron event loop alive. No reference to the child process is retained after this call (INV2).
- `stdio: 'ignore'` — the client has no ongoing relationship with the spawned process's output.

## Health checking (main process)

Module `packages/electron-app/src/backend-lifecycle/health-check.ts` exposes three purpose-specific functions, none of which take a timeout:

```ts
/** Single-shot check: does the backend at this port respond successfully right now? No retry. */
export async function probeHealthy(
  port: number,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(`http://localhost:${port}/health/live`);
    return response.ok;
  } catch {
    return false;
  }
}

/** Polls for a file's existence at a fixed interval, indefinitely. Never resolves false. */
export async function waitUntilFileExists(path: string, intervalMs: number): Promise<void> {
  while (!existsSync(path)) {
    await sleep(intervalMs);
  }
}

/** Polls the given health endpoint at a fixed interval, indefinitely, until it responds successfully. Never resolves false. */
export async function waitUntilHealthy(
  port: number,
  endpoint: '/health/live' | '/health/ready',
  intervalMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  while (true) {
    try {
      const response = await fetchImpl(`http://localhost:${port}${endpoint}`);
      if (response.ok) return;
    } catch {
      // not yet reachable — keep polling
    }
    await sleep(intervalMs);
  }
}
```

**Why no timeout anywhere:** per INV5, the splash never gives up on its own; only the user's Quit action (which exits the whole process) stops an in-flight wait. `probeHealthy` is the sole exception: it's a single-shot check used only to decide *whether to spawn*, not a wait loop, so it has no interval/timeout concept at all.

## Types (`packages/api-utils/src/api.ts`)

```ts
export type SplashPhase =
  | 'starting'
  | 'waiting-for-config'
  | 'waiting-for-live'
  | 'waiting-for-ready'
  | 'registering';

export type FailureReason =
  | 'app-data-config-missing'
  | 'backend-binary-missing'
  | 'spawn-failed'
  | 'registration-failed';

/** API exposed only to the splash window's preload script */
export interface SplashApi {
  onFailed: (callback: (reason: FailureReason, message: string) => void) => () => void;
  onStatus: (callback: (phase: SplashPhase, message: string) => void) => () => void;
  quit: () => Promise<void>;
}
```

`ConnectApi` (main-window renderer → main process registration-result reporting) is defined separately and is not affected by this feature.

## IPC surface

Handlers in `packages/electron-app/src/backend-lifecycle/ipc-handlers.ts`:

```ts
export function registerBackendLifecycleIpcHandlers(): void {
  ipcMain.handle('connect:quit', (): void => {
    app.quit();
  });
}
```

This is the entire IPC surface for backend lifecycle:

| Channel | Direction | Purpose |
| --- | --- | --- |
| `connect:quit` | renderer → main | Calls `app.quit()` |
| `connect:status` | main → splash | Phase/message updates during the sequence |
| `connect:failed` | main → splash | Terminal failure with reason + message |
| `connect:registration-result` | React app → main | Reports `ensureRegistered()` outcome |

## Splash screen

### Renderer implementation: React + QUI + Tailwind

The splash renderer is implemented in React + `@qualcomm-ui/react`, styled with Tailwind utility classes.

Entry point `packages/electron-app/src/splash/splash.tsx`:

```tsx
function App() {
  const [state, setState] = useState<SplashState>(INITIAL_SPLASH_STATE);

  useEffect(() => {
    const offStatus = window.splashApi.onStatus((phase, message) => {
      setState((s) => reduceSplashState(s, {message, phase, type: 'status'}));
    });
    const offFailed = window.splashApi.onFailed((reason, message) => {
      setState((s) => reduceSplashState(s, {message, reason, type: 'failed'}));
    });
    return () => {
      offStatus();
      offFailed();
    };
  }, []);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center p-6">
      <h1 className="mb-6 text-xl">AudioReach™ Creator</h1>

      {state.kind === 'connecting' && (
        <>
          <ProgressRing className="mb-2" />
          <p className="text-sm text-neutral-secondary" id="status-text">{state.message}</p>
        </>
      )}

      {state.kind === 'failed' && (
        <p className="text-sm text-neutral-secondary" id="status-text">{state.message}</p>
      )}

      <Button className="mt-4" emphasis="neutral" id="quit-button" onClick={() => void window.splashApi.quit()}>
        Quit
      </Button>
    </div>
  );
}

createRoot(document.getElementById('splash-root')!).render(<App />);
```

There is no settings form, no gear icon, and no `#settings-form`/`#gear-button`/`#retry-button` anywhere in the DOM. **The Quit button is rendered unconditionally**, outside any state branch, satisfying FR8 directly in the JSX structure rather than via a computed "is it enabled" check (there is nothing to gate: Quit is always available).

### Splash state (`splash-state.ts`)

```ts
export type SplashState =
  | {kind: 'connecting'; message: string; phase: SplashPhase}
  | {kind: 'failed'; message: string; reason: FailureReason};

export type SplashEvent =
  | {message: string; phase: SplashPhase; type: 'status'}
  | {message: string; reason: FailureReason; type: 'failed'};

export const INITIAL_SPLASH_STATE: SplashState = {
  kind: 'connecting',
  message: 'Starting AudioReach Creator...',
  phase: 'starting',
};

export function reduceSplashState(_state: SplashState, event: SplashEvent): SplashState {
  switch (event.type) {
    case 'status':
      return {kind: 'connecting', message: event.message, phase: event.phase};
    case 'failed':
      return {kind: 'failed', message: event.message, reason: event.reason};
  }
}
```

There is nothing left to gate here — Quit is unconditionally available in every state.

### Styling (Tailwind, no CSS files)

No hand-written `.css` file exists for the splash, matching `ArcStartPage`'s convention of styling everything via Tailwind utility classNames with zero co-located CSS files. `packages/electron-app/src/splash/splash-tailwind-input.css` is the only CSS *source* file, and it is import-only infrastructure, not component styling:

```css
@import 'tailwindcss';
@import '@qualcomm-ui/tailwind-plugin/qui.css';
@import '@qualcomm-ui/qds-core/styles/components.css' layer(components);
@import '@qualcomm-ui/qds-core/themes/qualcomm-dark.css' layer(components);
```

This mirrors `react-app/src/index.css`'s import chain, narrowed to the `qualcomm`/`dark` theme only (the splash never switches themes or brands). `scripts/build.ts` compiles this into `dist/splash/splash.css` via `@tailwindcss/cli`, run through `node:child_process.spawn` (the same pattern `start-electron.ts` already uses) before/alongside the esbuild steps:

```
tailwindcss -i src/splash/splash-tailwind-input.css -o dist/splash/splash.css --minify [--watch, in dev mode]
```

`splashRendererConfig.entryPoints` in `build.ts` is `['./src/splash/splash.tsx']`, with `jsx: 'automatic'` added to that esbuild config. `index.html` links the generated `splash.css` and loads `splash.js`:

```html
<!doctype html>
<html data-brand="qualcomm" data-theme="dark" lang="en" id="html">
  <head>
    <meta charset="UTF-8" />
    <title>AudioReach™ Creator</title>
    <link rel="stylesheet" href="./splash.css" />
  </head>
  <body>
    <div id="splash-root"></div>
    <script src="./splash.js"></script>
  </body>
</html>
```

### `package.json` dependencies

`packages/electron-app/package.json` dependencies: `react`, `react-dom`, `@qualcomm-ui/react`, `@qualcomm-ui/react-core`, `@qualcomm-ui/core`, `@qualcomm-ui/qds-core`, `@qualcomm-ui/utils`, `lucide-react`. DevDependencies: `@types/react`, `@types/react-dom`, `@tailwindcss/cli`, `@qualcomm-ui/tailwind-plugin`, `tailwindcss` — all pinned to versions already resolved elsewhere in the workspace (matching `react-app`'s pins) to avoid duplicate installs.

## Renderer registration wiring

`packages/react-app/src/main.tsx` calls `ensureRegistered()` on mount and reports the boolean outcome to the main process via `connect:registration-result`. `ensureRegistered()`, `http-client.ts`, and `useBackendConnectionStore` are never modified by this feature; only their existing call is wired into the startup sequence.

## Module layout summary

```text
packages/electron-app/src/
  main.ts                            # buildConnectDeps() binds every module below; app.whenReady() awaits splash load then runs the sequence once (no Retry)
  backend-lifecycle/
    connect-orchestrator.ts          # runConnectSequence — the 8-step sequence
    installation-paths.ts            # resolveInstallationFolder / resolveArcBackendDir / resolveArcBackendMainPath / resolveAppDataConfigPath
    backend-config-reader.ts         # readAppDataConfig / readBackendPort
    backend-spawner.ts               # detached spawn, no PORT env var
    health-check.ts                  # probeHealthy (single-shot) / waitUntilFileExists / waitUntilHealthy (both indefinite)
    ipc-handlers.ts                  # connect:quit only
  splash/
    splash-window.ts                 # creates the splash BrowserWindow, async, awaits loadFile()
    splash-preload.ts                # exposes window.splashApi only (onStatus/onFailed/quit)
    index.html                       # React mount shell, dark theme, links Tailwind-compiled splash.css
    splash.tsx                       # React entry point — App component, no settings/gear
    splash-state.ts                  # SplashState/SplashEvent — connecting | failed only
    splash-tailwind-input.css        # import-only Tailwind/QUI source, compiled by @tailwindcss/cli

packages/api-utils/src/api.ts        # SplashPhase, FailureReason, SplashApi

packages/react-app/src/main.tsx      # ensureRegistered(), reports result via connect:registration-result
packages/react-app/src/widgets/start-page/  # ArcStartPage — no settings dialog/gear icon

audioreach-creator-backend/          # OUT OF SCOPE for this feature — assumed to create its app-data folder,
                                     # write config.json with its bound port, and expose GET /health/live and
                                     # GET /health/ready.
```

## Error handling summary

| Condition | Reason | Behavior |
| --- | --- | --- |
| `app-data-config.json` missing/unparseable | `app-data-config-missing` | Terminal, Quit-only |
| `arc-backend/main.js` missing | `backend-binary-missing` | Terminal, Quit-only |
| `spawn()` throws synchronously | `spawn-failed` | Terminal, Quit-only |
| `ensureRegistered()` resolves `false` | `registration-failed` | Terminal, Quit-only |
| Backend `config.json` not yet written | — | Indefinite wait, 3s interval |
| `/health/live` not yet responding | — | Indefinite wait, 3s interval |
| `/health/ready` not yet responding | — | Indefinite wait, 5s interval |

No automatic retry loop at any point — Quit is the only user action available besides waiting, in every state.

## Testing considerations

- `installation-paths.ts` and `backend-config-reader.ts` are pure functions around `fs`/`path`/`app.getPath` — unit-testable with mocked `fs` and a stubbed `app.isPackaged`/`app.getPath`.
- `health-check.ts`'s three functions are unit-testable with a mocked `fetchImpl`/`fs.existsSync`, using short `intervalMs` values in tests; there are no `timeoutMs`/false-path tests, since `waitUntilFileExists`/`waitUntilHealthy` never resolve false by design.
- `connect-orchestrator.test.ts` mocks every `ConnectDeps` collaborator and covers: already-healthy-skip-spawn, spawn-then-wait-for-config, each of the four terminal-error branches, and the full happy path through to `showMainWindowAndCloseSplash`.
- `backend-spawner.test.ts` and `splash-state.test.ts` test only the current signatures/states described above.
- `home.spec.ts` (Playwright) asserts `#status-text` is visible on launch, and that `#quit-button` is always present/enabled while `#settings-form`, `#gear-button`, and `#retry-button` are absent from the DOM entirely.
- **Known gap:** `packages/electron-app`'s unit tests (`connect-orchestrator.test.ts`, `health-check.test.ts`, `backend-spawner.test.ts`, `splash-state.test.ts`, `sanity.test.ts`) have `jest.config.mjs` configured but no `package.json` script invokes Jest, and `jest` is not installed as a resolvable binary anywhere in the workspace. These test files are correct and ready to run once a Jest runner is wired up, but cannot currently be executed as part of CI or local verification.
- The Playwright e2e suite requires a real `app-data-config.json`, `arc-backend/main.js`, and a backend that writes `config.json` and serves `/health/live`/`/health/ready` to exercise the happy path end-to-end; without that environment, the app correctly sits in a `waiting-for-config`/`app-data-config-missing` state per FR6/INV5 rather than failing — this is correct behavior, not a test bug, but it does mean `home.spec.ts` alone cannot verify the full happy path in an environment without a real backend installed.
