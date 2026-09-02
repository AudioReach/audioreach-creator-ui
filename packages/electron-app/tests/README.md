<!--
Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
SPDX-License-Identifier: BSD-3-Clause
-->

# Electron E2E Tests

These tests exercise the packaged Electron boundary with Playwright. They
exist to verify user-visible behavior across the Electron main process,
renderer, and real HTTP backend while keeping repeated interactions readable.
The framework is a small test vocabulary on top of Playwright, not a second
browser automation engine. Playwright remains responsible for launching the
app, locators, assertions, network observation, traces, and reports.

The boundary is intentional:

- The tests may use the real backend and inspect its responses.
- They may install the test-scoped `OpenProjectFile` IPC seam described below
  to provide deterministic file-picker output.
- They must not start, manage, mock, health-check, or replace the backend.
- They must not monkey-patch arbitrary renderer APIs or copy private renderer
  implementation details into tests.

## Test Anatomy

Each spec uses the `testSession` fixture from `tests/framework`:

```ts
import {expect} from '@playwright/test';

import {openFile} from '../commands/home';
import {testSession} from '../framework';

testSession('opens a project', async ({testSession}) => {
  const result = await testSession.run(
    openFile({workspacePath: testSession.testData.validOpenProjectPath}),
  );

  expect(result.ok).toBe(true);
});
```

The pieces have these responsibilities:

- **Spec:** states the behavior and owns assertions. It composes commands and
  can use Playwright directly for a test-specific assertion or observation.
- **`testSession`:** launches one Electron app for the test, provides the
  `TestContext`, closes the app, and cleans up an installed IPC seam.
- **Runner:** `testSession.run(command)` wraps the command in a named
  `test.step`, attaches redacted command metadata, and wraps failures in a
  `CommandError` containing the command ID.
- **Semantic command:** a typed `TestCommand` with an `id` and an `execute`
  function. Commands describe user intent and return a typed output.
- **Page object:** exposes stable, feature-level interactions and locators.
  Page objects do not contain test assertions about the scenario.
- **Direct Playwright:** remains available through `testSession.page` and
  `testSession.pages`. Use it for a one-off assertion or observation; do not
  duplicate a reusable interaction's internal locator.

The feature folders are `commands/home`, `commands/settings`, and
`commands/graph`. Page objects are in `tests/pages`.

## Local Setup

Install the workspace dependencies, then install Playwright's Chromium
runtime once on each machine:

```sh
pnpm install
pnpm -C packages/electron-app exec playwright install chromium
```

The `@playwright/test` package and Electron are project dependencies, but the
browser executable is downloaded separately because it is a large,
platform-specific runtime. Repeat the browser install after upgrading the
Playwright version or when setting up a new machine or clean CI environment.

## Test Inputs

The fixture requires `tests/data/inputs.json`. It contains global defaults and
optional overrides keyed by explicit test-case IDs:

```json
{
  "defaults": {
    "useCaseQuery": "Speaker_Mic"
  },
  "cases": {
    "module-selection": {
      "customInputs": {
        "graph": {
          "moduleLabel": "Data Logging"
        }
      },
      "useCaseQuery": "Speaker"
    }
  }
}
```

Declare a case ID with `testCase(id)` as Playwright test metadata. Tests that
use the ordinary `testSession(title, body)` form receive the global defaults.
Relative paths in the input file are resolved from the `tests` directory.
Missing or malformed input files fail fixture setup with a diagnostic error.

`customInputs` is the extension point for feature-specific values. Keep these
values as JSON under a feature key, then parse and validate them in a small
feature helper rather than adding feature fields to `TestData`. Defaults and
case overrides are recursively merged, so a case can provide one graph value
without replacing the other graph values:

```json
{
  "defaults": {
    "customInputs": {
      "graph": {
        "moduleLabel": "Data Logging"
      }
    }
  },
  "cases": {
    "module-instance-selection": {
      "customInputs": {
        "graph": {
          "moduleInstanceId": "0xDEADBEEF"
        }
      }
    }
  }
}
```

The resolved value is available as `testSession.testData.customInputs`. A
feature helper such as `getGraphTestInputs(testData)` should check the feature
object and return a typed value before the spec uses it. Do not read arbitrary
keys directly in a spec or persist unstable DOM identifiers in this file.

## Canonical Examples

The following examples are the executable migration examples in
`tests/tests`. They are also the preferred patterns for new tests.

### EX-1: typed backend output

`openFile` reads the workspace fixture and its single sibling `.acdb` file,
opens the real file-upload flow, parses the HTTP response, and returns
`OpenFileResult`. EX-1 consumes the typed success result rather than reaching
into command internals:

```ts
const result = await testSession.run(
  openFile({workspacePath: testSession.testData.validOpenProjectPath}),
);

expect(result.ok).toBe(true);
if (result.ok) {
  expect(result.project.projectId).toBeTruthy();
}
```

### EX-1b and EX-1c: negative cases

`open-file-failures.spec.ts` covers backend rejection and cancellation. EX-1b
observes the upload response, asserts the rejection rule, checks the typed
failure message, and confirms the loading state clears. EX-1c installs a
cancelled file response, verifies no upload request occurred, and verifies no
danger toast was shown. EX-1c does not require backend availability because its
assertion is specifically that no request is issued.

### EX-2: reusable command

`settings.spec.ts` composes `openFile`, navigation, the settings page object,
and `toggleTheme`. The command performs the reusable interaction and returns
the opposite theme, while the spec asserts the state transition:

```ts
await testSession.run(expandSideNav());
await testSession.pages.settings.open();
const initialTheme = await testSession.pages.settings.rootTheme();
const nextTheme = await testSession.run(toggleTheme());

expect(['dark', 'light']).toContain(nextTheme);
expect(nextTheme).not.toBe(initialTheme);
```

### EX-3 and EX-4: Combobox selection and filtering

`selectAllUseCases` demonstrates the custom `@qualcomm-ui` Combobox by
selecting all available options. EX-4 extends this pattern with
`filterAndSelectUseCase({query})`, which filters the combobox by typing a
query string and then selects the first filtered result. Both commands
demonstrate reusable combobox interactions without exposing locators or
option-selection details to the spec.

### EX-5: ReactFlow selection

`selectModuleNode` accepts a typed `{nodeLabel, projectId}` identity and delegates
to `GraphPage`. `graph-page.ts` scopes the node by `data-project-id` and finds
the module by its visible footer label, then checks the selected ReactFlow
ancestor. This avoids persisting runtime-generated node IDs. Do not select a
graph node by position, generated DOM order, or an unscoped node ID.

### Graph Testability Requirements

EX-5 and all future graph tests depend on stable, application-level node
identity. The current implementation uses `data-project-id` to scope the
project and the visible module footer label to identify the requested module.
The footer label must remain addressable in the application's ReactFlow nodes.

**If these attributes are missing from the application:**

1. Do not weaken the test into coordinate-only selection or position-based
   DOM traversal.
2. Add the smallest testability attribute or accessibility improvement to
   the application (e.g., `data-node-id` on the node element).
3. Document the selector in the application's test-facing contract.
4. Update this section if the selector changes.

This ensures graph tests remain stable and maintainable as the application
evolves. Coordinate-based selection is fragile and breaks when the graph
layout changes.

## Backend Assertions

Choose the assertion case from the observable behavior, rather than asserting
both a network response and UI state for every flow:

1. **Request plus meaningful UI transition:** await and assert both the upload
   response and the resulting UI transition. Success is a `2xx` response with
   body `success: true`; the command returns `{ok: true, project}` and the
   success UI is visible. Rejection is a response with status `>= 400` or body
   `success: false`; the command returns `{ok: false, message}`, loading
   clears, and the failure notification is visible.
2. **Request with no meaningful UI transition:** assert the HTTP response only.
   Use this when the request is the behavior under test and the UI does not
   make a distinct, reliable transition. Do not add a weak or incidental UI
   assertion just to duplicate the response check.
3. **No request or client-side failure:** assert the UI or client signal only.
    EX-1c is this case: the cancelled `OpenProjectFile` response means no
    upload request is issued, the command returns
    `{ok: false, message: 'File selection cancelled'}`, and no danger toast is
    shown. It does not require backend availability.

**Example of case 2 (request with no UI transition):** If the application
issues a backend request to update a setting but does not show a toast or
loading overlay, assert the HTTP response only. Do not add a weak UI
assertion just to duplicate the response check. The observed HTTP status
and body are the authoritative signal that the backend honored the action.

For upload parsing, success requires both a `2xx` status and body
`success: true` (with project data at the DTO boundary). A response with status
`>= 400` **or** body `success: false` is a rejection. The fixture is not a
backend contract substitute: if the real external backend rejects the supplied
valid fixture with HTTP 400, record that as the external prerequisite blocker.
Do not fix it with backend mocks or backend management code.

## Adding Coverage

Add a command when a user-intent interaction has a stable name, needs a typed
input or output, or is likely to be composed by more than one test. Keep the
command in the feature folder that owns the behavior and give it a stable
feature-prefixed ID, such as `home.open-file` or `graph.select-module-node`.
Commands should use page objects rather than embedding locators.

Add a page object when a feature has a meaningful interaction surface or when
locators and interaction details need one owner. Expose semantic operations
such as `selectFirst()` and `selectedNode(identity)`, not implementation-only
selectors.

Promote a repeated one-off interaction after its second use. The first use may
stay direct Playwright when it is genuinely specific to that test; the second
use is the signal to extract a command or page-object method so locators do
not drift across specs.

### The `OpenProjectFile` seam

`testSession.installOpenProjectFileSeam(response)` is the exact test seam. The
renderer sends the Electron IPC message on channel `ipc::message` with request
`{data: null, requestType: ApiRequest.OpenProjectFile}`. The seam replaces the
`ipc::message` handler only for that request type and returns the normal IPC
response envelope:

```ts
{
  data: {
    cancelled: boolean;
    project?: ArcWorkspaceFileProperties;
    workspaceFileData?: Uint8Array;
    acdbFileData?: Uint8Array;
  };
  message: '';
  requestType: ApiRequest.OpenProjectFile;
}
```

The test supplies `cancelled`, optional `project`, and optional file bytes as
`Uint8Array` values. The main-process handler serializes each supplied byte
array with `Buffer.from(...)` in the response data before Electron returns it
to the renderer. The seam is installed for the current test-scoped Electron
application and its fixture teardown removes the handler after the test; it is
not a process-wide test service. Unknown request types are rejected rather
than turned into successful responses. Use this seam only to make the native
file-picker result deterministic. It does not mock the HTTP backend and does
not permit arbitrary renderer monkey-patching.

## Running Tests

From the monorepo root:

```text
pnpm -C packages/electron-app test
pnpm -C packages/electron-app test -- tests/tests/home.spec.ts
pnpm -C packages/electron-app test -- tests/tests/home.spec.ts -g "About"
pnpm -C packages/electron-app test -- --grep "EX-"
pnpm -C packages/electron-app test:ci
```

Equivalent commands from `packages/electron-app`:

```text
pnpm test
pnpm test -- tests/tests/home.spec.ts
pnpm test -- tests/tests/home.spec.ts -g "About"
pnpm test -- --grep "EX-"
pnpm test:ci
```

Launch the external backend separately using its own repository's documented
process before running EX-1 through EX-5. Those flows require the backend and
valid fixture data; these tests never launch or manage it. Framework, command,
and page-object contract tests do not require backend management. The `EX-`
grep selects the exemplar group. `test:ci` enables CI timeouts, one worker,
and one retry.

## Reports And Artifacts

Playwright writes failure artifacts under `test-results/artifacts`:

- Screenshots are retained on failure.
- Traces are retained on failure. Inspect one with
  `pnpm exec playwright show-trace test-results/artifacts/<trace>.zip` from
  `packages/electron-app`.
- The console `list` reporter remains enabled.
- JUnit output is `test-results/junit.xml`.
- The HTML report is `test-results/html`; open it with
  `pnpm exec playwright show-report test-results/html`.
- Machine-readable JSON output is `test-results/results.json`.

Run a focused test first when investigating a failure so its named command
steps and `command-metadata` attachment are easy to find in the HTML report.
Do not change reporter paths or remove failure screenshots and traces when
adding coverage.

### Runtime Locator Workflow

When a locator fails, reproduce the real user flow before changing selectors.
Use Playwright Inspector with `PWDEBUG=1`, or add a temporary focused
diagnostic spec that evaluates the live DOM after the relevant transition.
Inspect the side-nav root, accessible names, explicit roles, relevant data
attributes, and `outerHTML`; then check each candidate locator's count and
visibility. Prefer the stable observed role/name or application data attribute.
For QUI Combobox controls, open the real control and choose an option from the
live option list rather than guessing its markup. Add a test attribute only
after live inspection shows that semantic locators and existing application
identity attributes are insufficient.

## Direct Playwright Escape Hatch

Direct Playwright is appropriate for a scenario-specific assertion, response
observation, or a locator that has no reusable interaction yet:

```ts
await expect(
  testSession.page.getByText('Project opened successfully'),
).toBeVisible();
```

Use semantic roles, visible text, and application identity. If the same
interaction is used again, promote it after the second use. Direct Playwright
is an escape hatch, not a reason to copy locators from page objects or bypass
the command runner's named steps and typed handoffs.
