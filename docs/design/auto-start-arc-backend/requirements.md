# Auto-Start AudioReach Creator Backend — Requirements

**Status:** Current
**Repos affected:** `audioreach-creator-ui` only

## Goals

- On launch, the client locates the backend using a fixed, installer-defined directory layout — no user-facing configuration of backend location or port.
- The client detects whether a backend is already running and healthy; if so, it connects to it without spawning a new one.
- If no backend is detected, the client starts one itself, as an independent process, from a fixed location relative to its own installation directory.
- A splash screen shows status at every phase, with a single always-available Quit action. There is no Retry — the only entry point is app launch.
- The backend is never closed by the client, whether or not the client started it.
- No settings are editable by the user through the UI, anywhere, at any time. Backend port comes from the backend's own `config.json`; the app-data path comes from an installer-provided `app-data-config.json`.
- The splash renderer is implemented in React + `@qualcomm-ui/react` (QUI), styled with Tailwind utility classes — no hand-written CSS.
- Multiple client instances may run concurrently; each independently detects/starts a backend.

## Out of Scope

- Any change to `audioreach-creator-backend` — the backend must already create its app-data folder, write `config.json` with its bound port, and expose `GET /health/live` and `GET /health/ready`. This document does not specify backend-side behavior beyond what the client depends on.
- `@arc/desktop-supervisor`, `endpoint.json`-based discovery, or dynamic port allocation beyond what's described below — these remain future work per `docs/desktop-distribution-design.md`.
- Installer/packaging mechanics that produce the on-disk installation layout — only the client's runtime path-resolution logic is specified here.
- Monitoring the backend process for crashes _during_ an active session (only launch is handled; the client never manages backend shutdown).
- Any backend shutdown/stop mechanism — the client never closes or signals the backend to close.
- Coordinating backend startup across multiple concurrently-launching client instances beyond relying on OS-level port-bind failure (see INV1).
- Cross-platform path handling beyond straightforward use of Node's `path` module (illustrative examples below use Windows-style paths; the implementation is platform-correct via `path.join`/`path.resolve`).

## Distribution structure

- **FR1.** Binaries are laid out as `<installation folder>\arc-backend\`, `<installation folder>\arc-ui\`, and `<installation folder>\app-data-config.json`, all siblings. `<installation folder>` is resolved at runtime as the parent of the directory containing the running Electron executable (`dirname(app.getPath('exe'))`, one level up) — the installer's exact folder-naming/packaging mechanics are out of scope. In dev mode (`app.isPackaged === false`), `<installation folder>` falls back to the monorepo root's parent (`audioreach-creator-ui/../..` relative to the checkout), so a developer manually places/symlinks `arc-backend/` and `app-data-config.json` as siblings of the `audioreach-creator-ui` checkout for local testing.
- **FR2.** `app-data-config.json` (format: `{"app-data": "c:\\xyz\\abc"}`) is created by the installer and assumed to exist at launch — the client does not create it. If missing or unparseable, this is a terminal error (FR11).
- **FR3.** The backend's `config.json` (format: `{"ARC_PORT": "3000"}`) lives inside the app-data folder pointed to by `app-data-config.json`. The backend is responsible for creating the app-data folder and writing `config.json` with its bound port; the client only ever reads this file.

## Connect sequence

- **FR4.** On launch (the only entry point — no Retry):
  1. Resolve `app-data-config.json`; read its `app-data` path. Missing/unparseable → terminal error `app-data-config-missing`.
  2. Resolve `<installation folder>\arc-backend\main.js`; if it doesn't exist → terminal error `backend-binary-missing`.
  3. If `<app-data>\config.json` exists, read its `ARC_PORT`, and health-check that port (single-shot probe). If healthy → already running, skip spawning, proceed directly to the ready-wait (step 6, which passes immediately since the backend is already live).
  4. Otherwise (`config.json` missing, unparseable, or its port unhealthy): spawn the backend (detached, using Electron's bundled Node runtime, `cwd` = `arc-backend` dir, **no `PORT` env var** — the backend chooses/writes its own port). If `spawn()` throws synchronously → terminal error `spawn-failed`.
  5. Poll for `<app-data>\config.json`'s existence at a 3-second interval, indefinitely (no timeout), until it appears or the user clicks Quit.
  6. Once `config.json` exists, read `ARC_PORT` from it. Poll `GET http://localhost:<port>/health/live` at a 3-second interval, indefinitely, until it responds successfully, or Quit.
  7. Once live, poll `GET http://localhost:<port>/health/ready` at a 5-second interval, indefinitely, until it responds successfully, or Quit.
  8. Once ready: create the hidden main `BrowserWindow`, wait for the renderer's registration handshake (`ensureRegistered()` via `connect:registration-result`). If it resolves `false` → terminal error `registration-failed`. If `true` → show the main window and close the splash.
- **FR5.** `GET /health/live` and `GET /health/ready` are the health-check targets. Backend-side implementation of these endpoints is out of scope — assumed to exist.
- **FR6.** No timeout anywhere in steps 5–7 of FR4 — each wait is indefinite until its condition is met or the user quits.

## Splash screen UI

- **FR7.** No settings/gear icon, no settings form, no editable fields of any kind on the splash screen.
- **FR8.** A single Quit button is always visible, in every state — connecting or failed alike. Clicking it calls `app.quit()`, terminating the whole process. This is how "stop waiting" is satisfied; no in-process cancellation token is needed, since any in-flight indefinite wait simply never resolves once the process exits.
- **FR9.** A clear, distinct status message is shown at every phase (e.g. "Checking for running backend...", "Starting AudioReach Creator backend...", "Waiting for backend to initialize...", "Waiting for backend to start...", "Waiting for backend to become ready...", "Registering client...").
- **FR10.** No Retry button anywhere — the only actions available at any point are Quit (always) and waiting.
- **FR11.** Four terminal-error cases, each showing a distinct error message with Quit as the only action (no retry, no indefinite wait): `app-data-config-missing`, `backend-binary-missing`, `spawn-failed`, `registration-failed`.
- **FR12.** No configuration is editable anywhere in the client, pre-connect or post-connect.

### Splash renderer implementation

- **FR13.** The splash renderer is implemented in React + `@qualcomm-ui/react` (QUI). This trades a larger splash bundle and marginally slower first paint for visual/architectural consistency with the rest of the app (`ArcStartPage` and `packages/react-app` generally).
- **FR14.** The splash window's chrome is 420×320, frameless, non-resizable.
- **FR15.** Theming is static: `<html data-brand="qualcomm" data-theme="dark">` on the splash's own `index.html`, matching a fixed dark palette. No `ThemeProvider`, no runtime theme switching, no dependency on the main app's saved user preference.
- **FR16.** No hand-written `.css` file exists for the splash — matching `ArcStartPage`, which has zero co-located `.css` files and styles everything with Tailwind utility classNames. All splash layout is expressed as Tailwind utility classes directly on JSX elements. Component look-and-feel (colors, borders, focus rings) comes from QUI's own CSS, not hand-authored rules.
- **FR17.** Tailwind is part of `electron-app`'s build via a standalone `@tailwindcss/cli` compile step, producing a generated `dist/splash/splash.css` from a terse `@import`-only input file (`splash-tailwind-input.css`). This generated file is the only CSS asset shipped with the splash.
- **FR18.** The JS/TS build stays on esbuild. The splash renderer's entry point is a `.tsx` file, with `jsx: 'automatic'` added to its esbuild config.
- **FR19.** `packages/electron-app/package.json` carries direct dependencies on `react`, `react-dom`, `@qualcomm-ui/react`, `@qualcomm-ui/react-core`, `@qualcomm-ui/core`, `@qualcomm-ui/qds-core`, `@qualcomm-ui/utils`, `lucide-react`, and devDependencies on `@types/react`, `@types/react-dom`, `@tailwindcss/cli`, `@qualcomm-ui/tailwind-plugin`, `tailwindcss` — pinned to versions already resolved elsewhere in the workspace to avoid duplicate installs.

## Non-Functional / Invariants

- **INV1.** The client must never spawn a duplicate backend process when a healthy backend is already reachable at the configured port. (Note: with multiple client instances launching concurrently, two instances can each observe "not running" and both attempt to spawn; the OS port bind then allows only one to succeed. This residual race is accepted.)
- **INV2.** The client never terminates, signals, or otherwise manages the backend process after spawning it, regardless of client exit, whether it started the backend or connected to an existing one.
- **INV3.** Health-check polling uses fixed intervals (3s for config-file/`/health/live` waits, 5s for the `/health/ready` wait), not exponential backoff.
- **INV4.** The main application window must not be shown to the user until the connect sequence has fully succeeded (health-check and registration both pass); it may load its renderer bundle hidden in the background while registration is still in progress.
- **INV5.** The splash never gives up on its own — every wait state is either resolved by the awaited condition becoming true, or terminated by the user clicking Quit (which exits the process). There is no automatic timeout and no automatic retry anywhere in the connect sequence.

## Open Questions

None outstanding.
