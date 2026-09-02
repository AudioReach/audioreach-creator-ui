# Electron React E2E Test Framework Design

**Date:** 2026-08-26
**Target repository:** `C:\react\arc-ui-github`
**Target package:** `packages/electron-app`
**Status:** Draft for implementation planning

## Goal

Create a typed, extensible end-to-end test framework for the Electron frontend
using Playwright. Test authors should compose readable flows from reusable
feature commands while retaining a clear escape hatch to Playwright for new or
unusual UI behavior.

The framework must also migrate the existing Electron Playwright tests and
provide a developer guide that explains how to write, select, execute, and
debug individual tests and test groups.

## Context

The target repository is a pnpm/Turbo monorepo. The Electron package currently
contains a small Playwright suite under `packages/electron-app/tests` and
launches the built Electron entry point from `dist/main.cjs`.

The current configuration already provides useful infrastructure:

- Playwright Test as the test runner.
- Electron launch support through `@playwright/test`.
- List, JUnit, HTML, and JSON reporters.
- Screenshots on failure.
- Traces retained on failure.
- CI-specific retries, timeouts, and worker settings.

The current tests launch an application in `beforeAll`, use the first window,
and interact directly with locators. The first suite is small enough that the
framework can be introduced incrementally without a broad migration effort.

The legacy C#/WPF automation framework provides historical design inspiration.
Its useful layering is:

```text
command token
  -> top-level processor
    -> feature-specific command processor
      -> UI map operator
        -> test result and logging
```

The target implementation must not depend on the legacy repository being
available, indexed, built, or checked out. The relevant lessons are summarized
here so an implementation session in the target repository can work entirely
from this document.

The legacy framework also exposes weaknesses that should not be reproduced:

- A single large command enum grows over time.
- Prefix-based routing requires changes to a central dispatcher.
- Command payloads are often passed as `object` and checked at runtime.
- Exceptions can be swallowed by the top-level processor.
- `TestResult` duplicates behavior that the test runner already provides.

The new framework keeps the layering and extensibility while using TypeScript
types, feature-owned command modules, Playwright-native assertions, and
Playwright's reporting lifecycle.

## Requirements

### Functional requirements

**FR-1: Typed command flows**

Test authors must be able to compose test flows from typed command factories.
Command inputs and outputs must be statically typed. A command must have a
stable identifier for diagnostics and reporting.

**FR-2: Feature-scoped extensibility**

Commands must be grouped by feature or user-facing area. Adding a command must
not require editing a large central enum or switch statement.

**FR-3: Reusable UI operations**

The framework must support reusable commands for common UI operations,
including:

- Clicking and double-clicking controls.
- Filling and clearing text fields.
- Selecting options in native or custom comboboxes.
- Checking and unchecking checkboxes.
- Selecting radio buttons.
- Hovering, focusing, and keyboard interaction.
- Dragging and dropping elements.
- Interacting with ReactFlow nodes, ports, edges, and graph controls.
- Waiting for visible, enabled, attached, selected, or state-specific UI.
- File chooser and dialog workflows where the application exposes them.

Commands must prefer accessible roles, labels, and stable test-facing
attributes over brittle CSS or coordinate-only selectors.

**FR-4: Semantic feature commands**

The framework must support higher-level commands that represent reusable user
intent, such as opening a project, selecting a module, opening a side
navigation item, or enabling a graph module. Semantic commands may compose
lower-level commands and page-object operations.

**FR-5: Playwright-native assertions**

Assertions must use Playwright's `expect` and auto-waiting behavior. Framework
commands must not swallow assertion failures or replace Playwright's failure
model with a separate pass/fail result system.

**FR-6: Electron lifecycle management**

The framework must provide fixtures for launching and closing the Electron
application. The default lifecycle must isolate tests by launching an app per
test. Worker-scoped optimization may be introduced later only for suites with
an explicit and verified reset strategy.

**FR-7: External backend assumption**

The frontend backend is a separate repository and is outside the scope of this
framework. The framework must not start, stop, build, seed, or mock that
backend. Tests assume the backend is already running and reachable when the
Electron application is launched.

The initial framework must not add a backend readiness command. Backend
availability remains an execution prerequisite, and failures exposed through
the frontend must retain their normal Playwright/UI error context.

Tests may **passively observe** the HTTP request and response the frontend
issues to the backend (via Playwright network APIs such as `waitForResponse`)
in order to assert that a user action produced the expected backend outcome.
This observation is read-only: the framework must not start, stop, build, seed,
mock, or stub the backend, and must not add a backend readiness or health-check
command. Injecting inputs into Electron main-process OS dialogs (for example, a
file chooser) to supply test data is permitted and is not considered backend
management.

**FR-8: Existing test migration**

The existing tests under `packages/electron-app/tests/tests` must be migrated
to use the new fixture and command API. The migration must preserve their
behavior and coverage:

- Start page Projects and Devices buttons.
- Open File and Device Manager controls.
- Side navigation state transitions.
- About menu interaction and toast verification.

**FR-9: Test selection and execution**

Developers must be able to execute:

- One test file.
- One test by title or grep expression.
- A named group or tagged group of tests.
- The complete Electron E2E suite.

The developer guide must show exact commands executed from the monorepo root
and from `packages/electron-app`.

**FR-10: Diagnostics and reporting**

The framework must integrate with the existing Playwright reporters and
failure artifacts. Each command execution must be visible in the test report
as a named step. Command failures must include the command ID and useful
redacted input metadata where practical.

**FR-11: Developer documentation**

The implementation must include a developer-facing guide explaining how to:

- Discover and reuse existing commands.
- Compose a new flow.
- Add a command and page object when no reusable command exists.
- Write assertions and state-dependent actions.
- Run one test or a test group.
- Inspect screenshots, traces, HTML reports, JUnit output, and JSON output.
- Use direct Playwright as an intentional escape hatch.

### Non-functional requirements

**NFR-1: Type safety**

The framework must comply with the target repository's strict TypeScript
configuration. New framework code must not use `any` for command inputs,
outputs, context, or state.

**NFR-2: Failure transparency**

Unexpected errors and assertion failures must fail the current test with their
original cause preserved. The framework must not silently continue after a
failed command.

**NFR-3: Test isolation**

The default fixture must prevent state leakage between tests. Application
cleanup must run even when a test fails.

**NFR-4: Maintainability**

Framework files must have focused responsibilities. Feature command modules
must not contain unrelated feature logic, and page objects must not own test
scenario orchestration.

**NFR-5: Incremental adoption**

A new command or page object must be addable without requiring all existing
tests to migrate first. Direct Playwright tests must remain technically
possible during migration.

**NFR-6: Stable CI behavior**

The framework must preserve the current CI/local distinction for retries,
timeouts, workers, and output artifacts unless a change is required for
correctness.

## Scope

This design covers the test framework and its initial migration in
`packages/electron-app`.

Included:

- Playwright fixture and Electron lifecycle.
- Typed command contracts and command runner.
- Test context and typed flow state.
- Feature command organization.
- Page-object boundaries.
- Generic UI interaction commands.
- Semantic commands for migrated home/start-page flows.
- ReactFlow interaction strategy.
- Reporting, diagnostics, and failure handling.
- Existing test migration.
- Developer authoring and execution guide.

Explicitly excluded:

- Starting or managing the backend repository.
- Backend test doubles, API mocking, or contract-test infrastructure.
- Replacing Playwright Test.
- Replacing the current reporter set.
- Building a visual test recorder or a new test DSL.
- Full migration of all future UI areas before their commands are needed.
- Production application changes unrelated to testability attributes or
  accessibility contracts.

## Design decisions

### Decision 1: Typed command factories instead of a central enum

Commands are created by feature-owned factories. A command factory returns a
command object with a stable ID, typed input, and typed output. Feature modules
are composed explicitly by imports, so no central router must be updated for
every new command.

Example shape:

```ts
type TestCommand<TOutput> = {
  readonly id: string;
  readonly execute: (context: TestContext) => Promise<TOutput>;
};

type CommandFactory<TInput, TOutput> = (
  input: TInput,
) => TestCommand<TOutput>;
```

The concrete names may follow existing repository conventions, but the
following invariants are required:

- `id` is stable, descriptive, and safe to include in reports.
- Inputs are explicit and typed.
- Outputs are explicit and typed.
- Commands do not depend on hidden global mutable state.
- Command execution receives the shared test context.

### Decision 2: Two command layers

The command catalog has two layers:

1. **Interaction commands** provide reusable typed wrappers for common
   Playwright operations, such as click, check, select, fill, drag, and wait.
2. **Semantic feature commands** represent application workflows and compose
   interaction commands or page-object methods.

Interaction commands should not become a generic wrapper around every
Playwright method. They should exist when they standardize diagnostics,
selector policy, retries, or behavior needed by multiple features.

Semantic commands are the preferred API in tests because they communicate
intent and reduce locator duplication.

### Decision 3: Page objects own locators, not scenarios

Page objects and component objects own:

- Locators.
- Stable selector definitions.
- Low-level interactions.
- Small state queries needed by commands.

They must not own:

- Test titles.
- Test tagging.
- Cross-feature scenario sequencing.
- Backend startup.
- Global test state.

ReactFlow should use a dedicated graph object or page object that exposes
semantic operations such as locating a node by its domain name, locating a
port, and dragging a node. Tests should not repeat raw ReactFlow DOM traversal.

### Decision 4: Playwright controls the result lifecycle

The runner uses `test.step` and lets Playwright assertions and exceptions
control pass/fail behavior. It may emit structured command events for
diagnostics, but it must not convert failures into a return value that the
caller can accidentally ignore.

Command errors should preserve:

- Original error as the cause.
- Command ID.
- Redacted input metadata.
- Current test title when available.
- Page URL and relevant locator description when available.

### Decision 5: Test-scoped Electron application by default

The default Playwright fixture launches one Electron application for each test
and closes it in teardown. This is slower than sharing one application across
all tests, but it prevents side-navigation, project, graph, and persisted UI
state from leaking between tests.

If launch time becomes a measured bottleneck, a separate worker-scoped fixture
may be added for a suite that provides a verified reset command. That
optimization is not part of the initial foundation.

### Decision 6: Backend is an external prerequisite

The Electron test fixture launches the frontend application only. It may read
environment variables used by the frontend, but it must not own backend
processes or repository paths.

When a backend failure is suspected, the framework should report the command
and frontend state that exposed the failure. It should not retry indefinitely
or hide the backend error behind a generic UI timeout.

Because the frontend's reaction to a backend result is inconsistent across the
application — some calls toast, some only log, and some update state silently or
ignore a non-fatal result — the observed HTTP request/response at the frontend
boundary is the authoritative signal that a backend outcome occurred. The
required assertion policy has exactly three cases, and a test must follow the
one that matches its flow:

1. **Flow issues a request and exposes an observable UI transition:** assert on
   **both** the observed HTTP response and the UI transition.
2. **Flow issues a request but exposes no meaningful UI transition:** assert on
   the **HTTP response only**.
3. **Failure occurs before any request is issued** (for example, an OS
   file-read failure), or the action calls no backend: assert on the **UI (or
   other client-side) signal only**, because there is no HTTP response to
   observe.

Asserting UI visibility alone is insufficient to prove the backend honored an
action in cases 1 and 2; observing the request/response alone does not prove the
application reacted to it when a UI transition exists. Which UI signal exists (a
toast, a cleared overlay, a rendered result, or nothing observable) is per-flow
and must be determined from that flow's code, not assumed.

## Proposed architecture

```text
Playwright spec
  |
  v
Test fixture -> TestSession / TestContext
  |
  v
CommandRunner.run(command)
  |
  +--> test.step(command.id)
  +--> command.execute(context)
  |      |
  |      +--> semantic feature command
  |              |
  |              +--> page/component object
  |                      |
  |                      +--> ElectronApplication / Page / Locator
  |
  +--> structured diagnostics and Playwright artifacts
```

### Test context

`TestContext` is the dependency boundary for commands. It should contain only
resources that are valid for the current test:

- Electron application handle.
- Main page handle.
- Playwright `TestInfo`.
- Page and component object instances.
- Command runner or command services needed by nested commands.
- Typed per-test state, if a flow needs to carry outputs forward.
- Redaction and diagnostic helpers.

The context must not contain a global singleton application, a process manager
for the backend, or an untyped dictionary used as a hidden service locator.

### Command runner

The runner is responsible for:

1. Starting a named Playwright test step.
2. Recording command ID and safe metadata.
3. Calling the command's `execute` method.
4. Returning the typed command output.
5. Preserving the original error when execution fails.
6. Adding command information to the failure message or attachments when
   possible.

Nested commands should either be executed through the same runner or be
explicitly represented as a single semantic command step. The implementation
must avoid producing confusing duplicate steps for trivial internal helpers.

### Command composition

Tests should be able to compose commands sequentially and use typed outputs:

```ts
const opened = await testSession.run(
  commands.home.openFile({path: ctx.state.workspacePath}),
);

if (!opened.ok) {
  throw new Error(`open failed: ${opened.message}`);
}

await testSession.run(
  commands.graph.selectModuleNode({projectId: opened.project.projectId}),
);
```

The fixture is always named `testSession` (see the fixture section). Command
composition threads a command's typed **output** into a later command's input,
as shown above; this is distinct from mere sequencing (running B after A). At
least one exemplar test must demonstrate a real typed-output handoff, not only
sequential execution.

The `openFile` command output is a serializable discriminated union that is a
typed test-facing mapping of the frontend `ApiResult`/`ProjectInfoResponseDto`
contract (it maps `success`/`data` onto `ok`/`project`). It must not alternate
between "a DTO" and "a success/failure result" — it is always the union below,
and callers narrow on `ok`:

```ts
type OpenFileResult =
  | {readonly ok: true; readonly project: ProjectInfoResponseDto}
  | {readonly ok: false; readonly message: string; readonly errors?: string[]};
```

`ProjectInfoResponseDto` is the target repository's existing type; its
identifier field is **`projectId`** (string). There is no `id` and no
`defaultModuleName` field — downstream commands must key off `projectId` (or
another field the DTO actually defines, such as `name`). The command returns
this typed union rather than throwing on backend rejection; it throws only on
unexpected or infrastructure faults (see the exemplar-tests section).

Commands should return serializable domain values (identifiers, DTOs, state
snapshots) rather than live Playwright `Locator` handles. A later command that
needs an element should re-locate it through its page object using the passed
identifier. This keeps command outputs stable across re-renders and readable in
reports.

For common flows, a flow helper may compose several commands behind one
semantic API. The flow helper must remain a thin composition layer and must not
become a second test runner.

## UI interaction strategy

### Locator policy

Commands and page objects must use the following locator preference order:

1. Accessible role plus accessible name.
2. Associated label or visible text when it uniquely identifies the control.
3. Stable application test attribute such as `data-testid` or a documented
   domain-specific attribute.
4. Stable structural locator within a page/component object.
5. Coordinate interaction only when the UI is not represented by addressable
   DOM elements, such as a canvas-only surface.

Raw generated class names, deep CSS chains, and arbitrary timeout sleeps are
not acceptable default selectors.

### Common controls

The initial interaction command layer must cover:

- `click` and `dblclick`.
- `fill`, `clear`, and `press`.
- `check`, `uncheck`, and radio selection.
- Native `selectOption` and custom combobox workflows.
- `hover`, focus, and keyboard navigation.
- Visibility, enabled, checked, selected, attribute, and text assertions.
- File chooser handling.
- Drag/drop through locator-based drag where supported.

For custom controls, the page/component object should expose a semantic method
that knows the control's markup and state transitions. The test should not
depend on whether the implementation currently uses a native element or a
component library.

### ReactFlow

ReactFlow interactions must be designed around stable domain-level selectors.
The graph object should provide operations such as:

- Find a node by stable node ID or domain name.
- Find an input, output, or control port by stable port ID.
- Click or double-click a node.
- Select or multi-select nodes.
- Drag a node to a target position.
- Start and complete a connection gesture.
- Assert node, edge, selection, and validation state.

Preferred implementation order:

1. Use addressable ReactFlow DOM elements and `locator.dragTo()`.
2. Use a graph-specific mouse helper based on bounding boxes when a gesture
   spans nested SVG elements or ReactFlow's drag behavior requires it.
3. Use fixed coordinates only as a last resort, with stable viewport setup and
   a narrowly scoped helper.

If an interaction cannot be made reliable without a stable application hook,
the implementation plan must identify the smallest testability attribute or
accessibility improvement needed in the frontend.

## Fixture and lifecycle design

The existing `getTestApp()` helper should be replaced or adapted behind a
Playwright fixture. The fixture should:

- Resolve the built Electron entry point consistently.
- Launch the application with the existing required options.
- Obtain the first window or a named application window through a dedicated
  helper.
- Construct the `TestContext` after the page is available.
- Close the Electron application during teardown.
- Preserve the original launch error.
- Avoid logging unfiltered console output that violates repository test setup.

The fixture must make a session available to tests using the fixture name
`testSession`. That name must be used consistently throughout the developer
guide and migrated tests.

The fixture must not silently return a passing or skipped test when the app or
page cannot be initialized. Initialization failure must fail the test with a
diagnostic error.

## Reporting and diagnostics

The current Playwright configuration should remain the source of truth for:

- Console list output.
- JUnit output for Jenkins.
- HTML report.
- JSON results.
- Failure screenshots.
- Failure traces.

The framework should add command-level information using Playwright steps and
attachments rather than introduce a custom report format. Safe metadata may
include command ID, feature, input keys, and a locator description. Sensitive
values such as passwords, tokens, full file contents, or backend credentials
must be redacted.

Command failure messages should answer:

- Which command failed?
- Which feature owns it?
- Which test invoked it?
- What UI state or locator was expected?
- Where are the trace and screenshot artifacts?

The runner must not catch and ignore exceptions. Cleanup errors should be
reported without hiding the original test failure.

## Existing test migration

The first migration should cover:

`packages/electron-app/tests/tests/home.spec.ts`

Migration shape:

1. Replace module-level `ElectronApplication` state with the framework
   fixture.
2. Move application launch and teardown into the fixture.
3. Add semantic home, navigation, and About commands.
4. Replace direct locator calls with command execution.
5. Preserve meaningful test titles and assertions.
6. Add the `@smoke` tag to a `test.describe` group when the migrated tests are
   intended to be part of the smoke suite.
7. Run the migrated file directly and compare failures/artifacts with the
   pre-migration behavior.

The migration must not hide missing application behavior by weakening
assertions. A command may make a test more readable, but it must retain the
same observable expectation.

## Exemplar tests

The migrated home tests exercise only visibility assertions and one
expand/click/toast chain. They do not demonstrate the framework's headline
capabilities: an action that produces a verifiable outcome, a typed command
output consumed by a later command, custom combobox filtering, or a ReactFlow
interaction. To make the framework learnable by reading real tests, the
implementation must add a small, laddered set of exemplar tests. These are
real, standalone, executable tests that also contribute to coverage; they are
not scaffolding.

Each exemplar reuses the commands introduced by the previous one, so the set
teaches command reuse and typed-output composition by construction. The
exemplars must ride on flows the application actually exposes today and must
not invent UI that does not exist.

**EX-1: Open file and confirm the backend honored it.**

"Open File" on the start page triggers a native Electron open dialog and then
issues a `POST` to the backend (`projects/offline/upload-files`) returning a
typed `ProjectInfoResponseDto`. The test must:

- Inject the workspace path from `TestContext` by stubbing the Electron
  main-process handler for the `OpenProjectFile` IPC request so it returns the
  chosen file's data (the dialog and file read happen together in that handler;
  there is no path field to type into). Verify the exact IPC request/response
  shape per the claim-verification section.
- Execute an `openFile` semantic command.
- Assert on the observed HTTP response at the frontend boundary
  (`page.waitForResponse` for the upload endpoint; success means a 2xx status
  and a parsed body with `success === true` and a well-formed
  `ProjectInfoResponseDto` — see the rejection-signal note below) **and** on the
  UI state transition (the loading overlay appears and then clears; the success
  toast appears). This is case 1 of the Decision 6 assertion policy.
- The `openFile` command must return the typed `OpenFileResult` union (defined
  in the command-composition section) so later exemplars can consume
  `project.projectId`. This is the framework's worked example of acceptance
  criterion 4 (typed output consumed by a later command).

An implementation note, already verified: the upload request is a renderer-side
network call — `http-client.ts` issues a renderer-side `fetch` to the backend
base URL, so `page.waitForResponse` observes it with no IPC hop. Re-verify only
if the HTTP layer is moved to the main process.

**Rejection-signal note (applies to EX-1 and EX-1b).** The frontend maps
responses via `processApiResponse`: a non-OK HTTP status (>= 400) becomes
`success: false`, but a 2xx response returns the backend's JSON body verbatim —
so a rejection can also arrive as **HTTP 200 with `success: false` in the body**.
Tests must therefore treat failure as *either* a status `>= 400` *or* a parsed
body with `success === false`, and must not rely on `response.ok()` alone.
Correspondingly, success requires *both* a 2xx status and `success === true` in
the body.

The `openFile` command must surface a backend rejection as the `ok: false`
branch of its typed result, not as a thrown error. The frontend API contract
(`ApiResult`) does not throw on a failed open; it returns `success: false`. The
command mirrors this: it returns the typed union and throws only on unexpected
or infrastructure faults. This is what makes negative tests (EX-1b) possible —
a test must be able to treat a backend failure as the expected, passing outcome
rather than as a framework error.

**EX-1b: Confirm a backend-rejected open is handled as a failure.**

The negative counterpart to EX-1 for a rejection that reaches the backend, and
the reference example for author-written negative tests. Inject a *readable*
fixture file that the backend refuses (well-formed enough to be read from disk,
invalid enough that the backend rejects it). Because the file is readable, the
upload request **is** issued, so the test asserts:

- The observed HTTP response signals rejection per the rejection-signal note
  above (status `>= 400`, or a 2xx body with `success === false`) — not merely
  `!response.ok()`.
- The failure toast appears and the loading overlay clears (`showToast(...,
  'danger')` in the opener hook).

This is case 1 of the Decision 6 policy on the failure path. The test **passes
because the open was rejected as expected.** The negative pattern is the one
authors most reliably get wrong: they wrap the action in `try/catch` and swallow
the failure. Asserting the rejection signal gives a definitive, non-flaky pass.

**EX-1c: Confirm an OS-read failure issues no backend request.**

A distinct failure mode from EX-1b, kept separate because the open flow reads
the selected files *before* issuing any HTTP request. In the current code the
dialog and file read happen together in the Electron main process behind a
single IPC request (`ProjectService.openWorkspaceProjectFromFile` →
`electronApi.send({requestType: OpenProjectFile})`); the renderer only issues
the upload after receiving file data back. Drive this exemplar by making the
stubbed IPC response represent an unreadable/absent file (for example,
`cancelled: true` or a response with no file data). Because no file data
reaches the renderer, **no upload request is issued**.

This is case 3 of the Decision 6 policy. Assert the deterministic invariant:

- No upload request is issued (a `waitForResponse` on the upload endpoint would
  time out; assert absence, e.g. via a short-timeout race or request
  interception, rather than waiting on a response).
- The loading state clears and the app returns to a stable start-page idle.

Do **not** assert a danger toast. In the current renderer path an unreadable
file is reported as `'File selection cancelled'` and treated as user
cancellation — it returns silently with no toast (`use-project-opener.tsx`).
Whether a distinct read-error path (which would toast) exists depends on how the
main process classifies the failure; that classification is listed in the
claim-verification section. The no-upload/idle invariant holds regardless, so
EX-1c is a real, executable test asserting that invariant.

**EX-2: Open file, then change the theme from light to dark.**

Reuses EX-1's `openFile` command, expands the side navigation (the migrated
About test proves this path), opens Settings, and toggles the theme. Asserts
the theme state change on the application root (class or attribute), not mere
visibility. This exemplar forces the "which page object owns a UI region not in
the initial file tree" decision (Settings is neither the start page, side nav,
nor graph); the developer guide must record the resolution as precedent.

**EX-3: Open file, then select the first available use case.**

Reuses EX-1's `openFile` command, opens the use-case selection combobox, and
selects the first available option. Demonstrates the custom combobox pattern
(the control is a `@qualcomm-ui` `Combobox` with type-to-filter). Selecting the
first available option keeps the assertion robust without hardcoding a value.

**EX-4: Open file, then search for a use case and select it.**

Extends EX-3 by typing a use-case string from `TestContext` into the combobox
to drive its type-to-filter affordance, then selecting the filtered result.
This exemplar exists specifically to show how an existing test/pattern is
*extended* (pick-first becomes type-to-filter-then-select) using the same
reusable command surface.

**EX-5: Open file, select a use case, then select a module node by identity.**

Extends EX-4 and consumes the typed `projectId` from EX-1's `openFile` output
(the `ok: true` branch of `OpenFileResult`) to scope a ReactFlow node lookup,
then selects a module node whose stable ID or domain name is specified in
`TestContext`. This is the only exemplar that touches the canvas and is
therefore the reference for all future graph tests.

EX-5 is **conditional on the target node being addressable** by a stable
selector (a `data-*` node ID or an accessible name). Its first implementation
step must verify such a selector exists. If it does not, the blocking sub-task
becomes adding the smallest testability attribute or accessibility contract
needed (the escape already sanctioned in the ReactFlow section), gated by a
checkpoint before further graph work. This is a real dependency to surface in
the plan, not a reason to weaken or skip the test.

The exemplar set is deliberately minimal — one test per distinct pattern
(backend-confirmed action, backend-rejection assertion, pre-request failure,
typed-output handoff, settings/new-page-object, combobox select, combobox
filter-extend, ReactFlow node select). Introducing the commands these exemplars
require pulls the corresponding portion of sequencing task 7 forward; the plan
must budget for those first real semantic commands rather than deferring all
interaction/graph work.

### Executable exemplar contract

The exemplars are mandatory implementation deliverables, not optional examples
or documentation scaffolding. They must be standalone Playwright tests under
`packages/electron-app/tests`, must execute against the real Electron frontend
and externally running backend, and must contribute to the suite's coverage.
The developer guide must refer to these tests as the canonical examples of the
framework. A plan must allocate implementation and verification work for every
exemplar before the framework is considered complete.

The exemplars form a reuse ladder. Later tests must reuse the command surface
introduced by earlier tests rather than duplicate their locators or workflow
logic:

```text
EX-1
  -> EX-1b
  -> EX-1c
  -> EX-2
  -> EX-3
       -> EX-4
            -> EX-5
```

Each exemplar has the following non-negotiable teaching objective and pass
contract:

- **EX-1:** Demonstrate the complete open-file flow. The test installs the
  framework's test seam for the `OpenProjectFile` request, invokes `openFile`,
  observes `POST projects/offline/upload-files`, and asserts both the successful
  HTTP result and the loading/success UI transition. The command returns the
  typed `OpenFileResult` used by later tests.
- **EX-1b:** Demonstrate an expected backend rejection. The injected file data
  must be readable by the Electron process but invalid for the backend. The
  test passes only when the observed response is rejected by either HTTP status
  (`>= 400`) or a parsed body with `success === false`, and the failure toast
  appears while the loading state clears. The test must not pass by catching and
  ignoring a command exception.
- **EX-1c:** Demonstrate a client-side failure before upload. The injected IPC
  response must represent cancellation or missing file data, so the renderer
  receives no usable file data and issues no upload request. The test asserts
  the absence of the upload request and the return to stable start-page idle
  state. It must not require a danger toast because the current cancellation
  path is intentionally silent.
- **EX-2:** Demonstrate adding a page object for a distinct UI region. The test
  reuses `openFile`, expands the side navigation, opens Settings, toggles the
  theme, and asserts the application-root theme state rather than visibility
  alone. `settings-panel.ts` is the precedent for a region-specific page
  object.
- **EX-3:** Demonstrate the custom `@qualcomm-ui` Combobox command by opening
  the use-case selector and choosing the first available option without
  hardcoding a value that is not guaranteed by the application data.
- **EX-4:** Demonstrate extending an existing command. It reuses EX-3's
  selection surface, types a use-case string supplied by `TestContext`, and
  selects the filtered result. It must not introduce a second locator strategy
  for the same combobox.
- **EX-5:** Demonstrate a ReactFlow operation using the typed `projectId`
  handoff from EX-1, then select a module node by stable identity. This test is
  conditional only on the first implementation checkpoint proving that a
  stable node selector or accessible name exists. If no such selector exists,
  the plan must add the smallest testability attribute or accessibility
  contract before implementing the graph command; it must not weaken the test
  into coordinate-only selection or skip it.

#### Open-file test seam

The current application contract must be treated as the source of truth for
EX-1, EX-1b, and EX-1c. The renderer sends an
`OpenProjectFileRequest` with `data: null` and
`requestType: ApiRequest.OpenProjectFile` through the preload API. The main
process receives it on the `ipc::message` handler and calls `openProjectFile`.
The response data is `OpenProjectFileResponseData` with these fields:

```ts
type OpenProjectFileResponseData = {
  readonly cancelled: boolean;
  readonly project: ArcWorkspaceFileProperties | undefined;
  readonly workspaceFileData?: Buffer;
  readonly acdbFileData?: Buffer;
};
```

The framework must provide a narrow, teardown-safe test seam for supplying this
response before the test invokes `openFile`. The seam may be implemented in the
Electron test launch path or through an explicitly test-only application hook,
but it must be documented with the exact request and response shape. A test
must not attempt to type a path into the UI because the current flow has no path
field. A test must not monkey-patch an arbitrary renderer global or modify the
backend.

The required fixture responses are:

1. **Successful open:** `cancelled: false`, project metadata present, and both
   `workspaceFileData` and `acdbFileData` populated with readable fixture bytes.
2. **Backend rejection:** the same readable IPC response shape as a successful
   open, but fixture bytes that the external backend rejects.
3. **Pre-upload failure:** `cancelled: true`, or a response with no project/file
   data that the current service rejects before constructing the upload request.

The plan must verify the seam can be installed before the application handles
the request, can be removed during teardown, and cannot hide application launch
or IPC initialization failures. If the current launch architecture cannot
provide this seam without an unbounded production change, planning must stop at
that checkpoint and identify the smallest sanctioned testability change.

#### Typed open-file boundary

The API response contract uses `ProjectInfoResponseDto.projectId`, while the
current `ProjectService.openWorkspaceProjectFromFile()` maps the successful
response into the application-facing `ProjectInfo.id`. The `openFile` command
must use the observed renderer-side upload response as its test-facing boundary
and preserve the API's `ProjectInfoResponseDto` shape. It must not pretend that
the service's smaller `ProjectInfo` object is a `ProjectInfoResponseDto` by
casting it. The command may still use the service-driven UI flow for the action,
but its typed output is derived from the observed HTTP status and parsed body.
The public command output is always this stable union and never alternates
between a DTO and a result wrapper:

```ts
type OpenFileResult =
  | {readonly ok: true; readonly project: ProjectInfoResponseDto}
  | {readonly ok: false; readonly message: string; readonly errors?: string[]};
```

The plan must name the response parser/mapper, state where it runs, and add a
focused assertion that the `ok: true` branch exposes `project.projectId` to
EX-5. Backend rejection returns `ok: false`; only unexpected or infrastructure
faults throw. If the observed success body does not contain all fields required
by `ProjectInfoResponseDto`, the plan must introduce a separate explicitly
named test-facing DTO rather than weakening or falsely casting this contract.

#### Baseline migration contract

The current baseline is
`packages/electron-app/tests/tests/home.spec.ts`, selected by the package
Playwright configuration (`testDir: './tests'`, `testMatch: '**/*.spec.ts'`).
It currently contains three tests that must retain their observable coverage:

1. Start page displays `Projects` and `Devices` buttons.
2. Start page displays `Open File` and `Device Manager` controls.
3. The side navigation transitions from `data-state="closed"` to
   `data-state="open"`, then clicking `About` displays
   `About AudioReach Creator`.

Migration must replace the module-level `beforeAll` application and
`afterAll` cleanup with the `testSession` fixture. Missing application/page
initialization must fail with a diagnostic error; it must not retain the
current `return test.fail()` soft-failure behavior. The existing package script
is `pnpm test`, and the configured artifact paths are
`test-results/artifacts`, `test-results/html`, `test-results/junit.xml`, and
`test-results/results.json`.

## Developer guide design

The implementation must add the developer guide at:

`packages/electron-app/tests/README.md`

The guide should include these sections:

### Why use the framework

This section must persuade, not just instruct. The framework is a thin enabling
layer over Playwright, and following it is what keeps a multi-author suite
trustworthy. The guide should make these points concrete:

- **The hard problems are solved once.** Electron launch and per-test isolation,
  the native file-dialog stub, the two-signal backend assertion, and ReactFlow
  node addressing are non-obvious and easy to get subtly wrong. The framework
  solves each once so an author does not re-solve them per feature.
- **Reuse instead of copy-paste.** A command such as `openFile` is written once
  and consumed by many tests. When the underlying flow changes, one command is
  updated rather than every spec that copied it.
- **A consistent pass/fail contract.** Commands surface backend outcomes as
  typed results and throw only on unexpected faults, so positive and negative
  tests assert the same way across features. Authors do not each invent their
  own error handling.
- **No silent green.** The fixture fails a test when the app or page cannot
  initialize, replacing ad-hoc idioms such as returning a soft pass on a missing
  window. A green suite means the app actually worked.

The guide should also state the honest boundary: the framework is worthwhile
because tests are developed in parallel against an Electron + backend + ReactFlow
application. It must stay thin — page objects do not own scenarios, commands are
not a wrapper around every Playwright call, and direct Playwright remains an
intentional escape hatch. The worst outcome the framework prevents is a suite
that reports green while masking real breakage; the worst outcome an overgrown
framework would cause is ceremony without benefit. Authors keep the balance by
promoting an interaction to a command only when it is reused (see the
escape-hatch threshold).

### Test anatomy

Explain the relationship between:

- Playwright spec.
- `testSession` fixture.
- Command runner.
- Semantic commands.
- Page/component objects.
- Direct Playwright escape hatch.

### Reusing existing commands

Show how to search the command catalog by feature and compose commands in a
new test. The example must use typed inputs and outputs and must not expose
internal locators.

### Writing a new flow

Explain how to identify the business steps, choose existing commands, add a
small flow helper when composition repeats, and keep assertions close to the
behavior they verify.

### Asserting backend-dependent actions

Most tests authors write will act on the app and then need to confirm the
backend honored the action. Follow the same three-case policy defined in
Decision 6, and read your flow's code before choosing:

1. **Request issued, observable UI transition exists:** assert on **both** the
   HTTP response (`page.waitForResponse` for the flow's endpoint) and the UI
   transition.
2. **Request issued, no meaningful UI transition:** assert on the **HTTP
   response only**.
3. **Failure before any request, or no backend call:** assert on the **UI (or
   other client-side) signal only** — there is no HTTP response to wait on.

Two rules make the common mistakes explicit:

- **The observed HTTP response is the authoritative signal (cases 1 and 2).**
  Note that a rejection is not always a non-OK status: the client maps an HTTP
  error to `success: false`, but a backend may also return HTTP 200 with a body
  of `success: false`. Assert failure as *either* a status `>= 400` *or* a
  parsed body with `success === false` — do not rely on `response.ok()` alone.
- **The UI signal is per-flow — read your flow's code before asserting on it.**
  Some flows show a toast, some only log, some update state silently, some
  ignore a non-fatal result. Do not assume a toast or overlay exists because
  another exemplar used one; open the flow's component/hook and assert on what
  it actually does.

EX-1 is the worked reference for case 1 (backend-confirmed with UI transition),
EX-1b for case 1 failure (readable-but-rejected file), and EX-1c for case 3
(OS-read failure before any request).

### Adding a new command

Document the required sequence:

1. Add or extend the relevant page/component object.
2. Define typed input and output types.
3. Add a feature-scoped command factory with a stable ID.
4. Execute it through the shared session runner.
5. Add focused command or flow coverage.
6. Use the command in the new test.

### Running tests

The guide must provide exact examples for the package scripts and Playwright
CLI. FR-9 requires both forms: run from the monorepo root (using `-C`) and run
from within `packages/electron-app`.

From the monorepo root:

```text
pnpm -C packages/electron-app test
pnpm -C packages/electron-app test -- tests/tests/home.spec.ts
pnpm -C packages/electron-app test -- tests/tests/home.spec.ts -g "About"
pnpm -C packages/electron-app test -- --grep @smoke
```

From within `packages/electron-app` (after `cd packages/electron-app`):

```text
pnpm test
pnpm test -- tests/tests/home.spec.ts
pnpm test -- tests/tests/home.spec.ts -g "About"
pnpm test -- --grep @smoke
```

The exact package script name (`test`) and any wrapper flags must be verified
against the package's `package.json` during implementation; if the script is
named differently, the guide must use the actual name in both forms.

The initial tagging convention is a `test.describe('@smoke', ...)` or test title
containing `@smoke`; Playwright `--grep @smoke` selects the group. No separate
annotation or tag plugin is required.

### Debugging

Explain where to find:

- `test-results/artifacts`.
- `test-results/html`.
- `test-results/junit.xml`.
- `test-results/results.json`.

Explain how to use a trace and how to run a focused test while investigating
an interaction failure.

## File and module boundaries

The implementation plan should create the following exact initial files and
ownership boundaries. Additional feature command/page files may be added under
the indicated directories as migration expands.

```text
packages/electron-app/tests/
  framework/
    command.ts             Command contract and shared types.
    command-runner.ts      Playwright step and error boundary.
    test-context.ts        Electron/page/session context contract.
    fixtures.ts            Playwright fixture and app lifecycle.
    errors.ts              Typed command error enrichment.
    redaction.ts           Safe diagnostic metadata handling.
  pages/
    home-page.ts           Home/start page locators and operations.
    side-nav.ts            Side navigation locators and state operations.
    settings-panel.ts      Settings/theme locators and state operations.
    graph-page.ts          ReactFlow graph operations and assertions.
  commands/
    home/                  Start-page semantic commands (includes open-file).
    navigation/            Side-navigation commands.
    settings/              Settings/theme commands.
    graph/                 ReactFlow semantic commands.
    app/                   Application-level commands where needed.
  flows/
    ...                    Reusable multi-command user flows only.
  tests/
    home.spec.ts           Migrated existing tests.
  README.md                Developer authoring and execution guide.
```

The fixture export from `fixtures.ts` is `testSession`. The initial migrated
spec remains at `packages/electron-app/tests/tests/home.spec.ts`; moving it to
a different directory is not part of this design.

The implementation should avoid creating a single `commands.ts` file that
contains every feature. It should also avoid placing page objects inside
feature command files when those page objects are reused by multiple commands.

When a test needs to interact with a UI region that no existing page object
owns (for example, a settings panel or property inspector), a new page object
should be created for that region rather than overloading an unrelated one. A
region earns its own page object when it has a distinct set of locators and
state transitions; the developer guide must document this rule and cite
`settings-panel.ts` as the first worked precedent.

The direct Playwright escape hatch remains available (NFR-5), but a repeated
interaction should be promoted to a command rather than copied. The working
threshold: use direct Playwright for a one-off interaction; once the same
interaction is needed by a second test, promote it to an interaction or
semantic command. The developer guide must state this threshold so authors do
not either over-build commands for single use or copy locators across specs.

## Data flow

```text
testSession fixture
  -> creates ElectronApplication and Page
  -> creates page/component objects
  -> creates TestContext
  -> exposes session.run(command)

test
  -> constructs typed command
  -> runner opens test.step(command.id)
  -> command uses context and page object
  -> command returns typed output or throws
  -> runner records success/failure
  -> Playwright emits configured artifacts and reports
```

The backend is external to this flow. No backend process node or backend
fixture is part of the framework architecture.

## Error handling

The following rules are required:

- App launch failures fail the test immediately.
- Missing page/window failures fail the test immediately.
- Locator timeout failures retain the Playwright timeout context.
- Assertion failures remain Playwright assertion failures.
- Command errors add command ID and safe input context without replacing the
  original cause.
- Teardown always attempts to close the Electron application.
- Teardown errors do not hide a prior test failure.
- Backend unavailability is reported as an application/test prerequisite
  failure, not silently retried forever.
- Unknown command usage is a TypeScript/API error during development, not a
  runtime fallthrough to an `UNKNOWN` result.

## Testing strategy for the framework itself

The implementation plan must test the framework in layers:

### Framework-level tests

Do not add a second unit-test runner or a new test framework in the initial
implementation. Use the existing `@playwright/test` dependency for focused
framework-level tests that do not require a browser when practical. Cover pure
or mostly pure behavior such as:

- Command metadata and input typing at compile time where practical.
- Safe metadata redaction.
- Error enrichment preserving the original cause.
- Flow composition and typed output propagation.
- Selector helper behavior that does not require Electron.

### Focused Playwright tests

Use the migrated home tests to prove:

- Fixture launch and teardown.
- Command step names appear in reports.
- Semantic commands execute the expected UI behavior.
- Assertions still fail when the expected UI is absent.
- Existing screenshots and traces are generated on failure.

### Interaction coverage

Add focused examples as commands are introduced for:

- Checkbox and radio state.
- Native/custom combobox selection.
- Click and double-click.
- Drag/drop.
- ReactFlow node and connection interactions.

The initial migration does not need to create artificial tests for every
interaction type if the application does not currently expose each control.
The command contracts and developer guide must nevertheless document how those
interactions are supported.

## Acceptance criteria

The design is considered implemented when all of the following are true:

1. A Playwright test can obtain a test-scoped Electron session through the
   framework fixture.
2. A test can execute a typed semantic command through the shared runner.
3. The command appears as a named step in the Playwright report.
4. A command can return a typed output consumed by a later command.
5. A feature can add a command without editing a central enum or dispatcher.
6. Common control interactions are supported through reusable interaction or
   semantic commands.
7. ReactFlow operations have a dedicated page/component boundary and stable
   selector policy.
8. Command and assertion failures fail transparently with useful diagnostics.
9. The backend remains an external prerequisite and is not managed by the
   framework.
10. The existing home tests are migrated without reducing their assertions.
11. A developer guide explains command reuse, new-flow creation, and focused
    test execution.
12. The existing list, JUnit, HTML, JSON, screenshot, and trace outputs remain
    available.
13. The framework and migrated tests pass local typecheck/lint/test commands
    appropriate to the target package.
14. The exemplar tests (EX-1, EX-1b, EX-1c, and EX-2 through EX-5, with EX-4
    extending EX-3) are implemented as real, executable tests. At least one
    demonstrates a typed command output consumed by a later command; EX-1
    asserts a backend success via both the observed HTTP response and the
    resulting UI state; EX-1b asserts a backend rejection as the passing
    outcome; and EX-1c asserts a pre-request failure whose invariant is that no
    upload request is issued and the loading state clears.
15. A backend-dependent action can be validated by passively observing the
    frontend's HTTP request/response without the framework starting, stopping,
    mocking, or health-checking the backend, using the rejection-signal rule
    (status `>= 400` or body `success === false`, not `response.ok()` alone).

## Claim verification before planning

This spec was written against a specific reading of the target repository, and
several requirements depend on code-derived claims that may drift. Before
`superpowers:writing-plans` produces a plan from this document — as the first
step of the target-repo session — re-verify each claim below against the current
source. If any claim is now false, update the affected section of this spec (or
note the deviation in the plan) before proceeding; do not plan against a claim
that no longer holds.

Claims to verify, with where they were read:

1. **Upload is a renderer-side fetch.** `packages/react-app/src/shared/api/http-client.ts`
   issues a renderer-side `fetch` to the backend base URL (so
   `page.waitForResponse` observes it). Verify the HTTP layer has not moved to
   the Electron main process (which would require a main-process hook instead).
2. **Open File uses a native dialog via IPC, not a path field.**
   `packages/react-app/src/widgets/start-page/ui/arc-start-page.tsx` calls
   `openWorkspaceProject()` with no argument; the renderer then calls
   `ProjectService.openWorkspaceProjectFromFile`
   (`packages/react-app/src/entities/project/services/project-service.ts`),
   which issues the `OpenProjectFile` IPC request whose main-process handler
   runs the dialog. Verify no path text input has been added and that the IPC
   request type name is unchanged.
3. **File read happens before the upload request, in the main process.** The
   open flow is a single IPC round-trip
   (`packages/react-app/src/entities/project/services/project-service.ts`,
   `openWorkspaceProjectFromFile` → `electronApi.send({requestType:
   OpenProjectFile})`); the main process runs the dialog and reads the files,
   returning file data to the renderer, which only then builds `File` objects
   and issues the upload POST
   (`packages/react-app/src/entities/project/api/projects-api.ts`). So a
   read/selection failure returns before any HTTP request (the basis for
   EX-1c). Verify this ordering and the IPC shape (it also determines how EX-1c
   stubs the failure).
4. **Rejection signal is status-or-body.** `packages/react-app/src/shared/api/utils.ts`
   (`processApiResponse`) maps non-OK HTTP to `success: false` but returns a 2xx
   body verbatim, so a rejection can be HTTP 200 with `success: false`. Verify
   this mapping still holds (it is the basis for the rejection-signal rule).
5. **Project DTO identifier field.** `packages/react-app/src/entities/project/model/project.dto.ts`
   defines `ProjectInfoResponseDto` with a **`projectId`** field (no `id`, no
   `defaultModuleName`). Verify the field name before wiring the typed
   `OpenFileResult` handoff.
6. **Open-failure UI signal is flow-specific and mode-specific.** On a *backend*
   rejection the open flow surfaces a danger toast
   (`packages/react-app/src/widgets/start-page/use-project-opener.tsx`,
   `showToast(..., 'danger')`) — the observable signal for EX-1b. But a
   *read/selection* failure is reported as `'File selection cancelled'` and
   handled as silent user cancellation with **no toast**
   (`packages/react-app/src/entities/project/services/project-service.ts` and
   `packages/react-app/src/widgets/start-page/use-project-opener.tsx`) — hence EX-1c
   asserts the no-upload/idle invariant, not a toast. Verify both behaviors, and
   whether the main process distinguishes a genuine read error from a cancel,
   which could change EX-1c's available UI signal. This is flow-specific, not
   a general rule (see Decision 6).
7. **Reporter output paths and run scripts.** The `test-results/*` artifact
   locations, the reporter set, and the `test` package script name used in the
   run examples must be confirmed against `playwright.config` and the package's
   `package.json`.

The framework directory structure described in the file-boundary section does
not yet exist in the target repository; only `home.spec.ts` and the Electron
test utilities are present. Creating that structure is implementation work, not
a claim to verify.

## Implementation sequencing guidance

The future implementation plan should be decomposed into independently
verifiable tasks in this order:

1. Establish or verify the target package's test fixture and build
   prerequisite. As part of this task, read and confirm the current
   `playwright.config`, the existing `home.spec.ts`, the `getTestApp()` helper,
   and the actual reporter output paths. Treat any path or command asserted in
   this document (for example, `test-results/*` locations and CLI invocations)
   as to-be-verified against the repository rather than assumed.
2. Add the command/context/error contracts and focused framework-level
   coverage using the existing Playwright dependency. Pin the exact public
   signatures for `TestCommand`, `CommandFactory`, and `TestContext`, and pin
   the compile-time type-testing mechanism (for example, `tsc --noEmit` type
   assertions) rather than leaving it to interpretation.
3. Add the command runner and Playwright fixture integration.
4. Add page/component objects for the start page and side navigation.
5. Add home/navigation/About semantic commands.
6. Migrate `home.spec.ts` and verify reports/artifacts.
7. Add generic interaction helpers and ReactFlow boundaries as the first real
   feature flows require them. The exemplar tests (EX-1 through EX-5) are the
   first such flows and drive which commands are built first: the open-file
   command with dialog stub and network-observed assertion, including its
   rejection (EX-1b) and pre-request-failure (EX-1c) paths (EX-1); the
   settings/theme command and `settings-panel.ts` (EX-2); the use-case combobox
   select and filter commands (EX-3, EX-4); and the ReactFlow node-select
   command with its addressable-selector precondition (EX-5).
8. Add the developer guide and exact execution examples, including the new
   page-object rule, the escape-hatch threshold, and the two-signal assertion
   pattern for backend-dependent flows.
9. Run typecheck, lint, focused Playwright tests, and the complete Electron
   test suite.

Each task should produce a small, testable change and should avoid introducing
commands for UI areas that have no current test need.

## Resolved assumptions

- The target repository is `C:\react\arc-ui-github`.
- The target package is `packages/electron-app`.
- The backend is running independently when E2E tests execute.
- Playwright remains the only E2E test runner.
- Typed command flows are the preferred authoring model.
- Direct Playwright access remains available as an escape hatch.
- The default Electron lifecycle is test-scoped.
- Existing tests are migrated as part of the framework work.
- The developer guide is part of the deliverable.
- The spec is intended to be copied into the target repository and passed to
  `superpowers:writing-plans`.

### Legacy reference policy

References to the C#/WPF automation framework are historical rationale only.
They explain why the design uses feature-scoped commands, typed payloads,
page/component boundaries, and a shared execution path. The target
implementation must not add a dependency, build step, MCP requirement, or
runtime integration for the legacy repository.

### Rejected approaches

**Direct page-object tests** were rejected as the primary model. They are easy
to start, but repeated business workflows would spread locator knowledge across
spec files and make reuse dependent on copying test code.

**A central enum and prefix-based dispatcher modeled directly on the legacy
framework** was rejected. It preserves the familiar command vocabulary but
creates a growing central routing file, weakens TypeScript payload typing, and
requires unrelated features to modify the same dispatcher.

**A new declarative DSL or Gherkin/JSON command format** was rejected. It would
introduce a second language and reporting layer on top of Playwright, reduce
TypeScript discoverability, and add parsing and maintenance cost without a
current requirement for non-TypeScript test authors.

**The preferred approach is typed feature command factories plus
page/component objects and a shared Playwright-aware runner.** It was chosen
because it keeps test intent readable, gives commands typed inputs and outputs,
allows feature teams to extend the catalog independently, preserves direct
Playwright access when needed, and uses Playwright's native assertions and
artifacts instead of duplicating the test runner.

### Plan-level decisions

- The initial fixture export is `testSession`.
- The default Electron application scope is one application per test.
- The initial framework does not start, stop, mock, or health-check the
  backend, but tests may passively observe the frontend's HTTP request/response
  to assert backend outcomes.
- Test data for the open-file flow is supplied by stubbing the Electron
  main-process `OpenProjectFile` IPC handler (which performs both the dialog and
  the file read), not by driving a non-existent path field.
- Backend-dependent flows follow the three-case assertion policy in Decision 6:
  both HTTP and UI when a UI transition exists, HTTP-only when it does not, and
  UI-only when the failure occurs before any request is issued.
- Semantic commands return serializable domain values (identifiers, DTOs),
  not live `Locator` handles.
- The initial tag convention is `@smoke` in `test.describe` or test titles,
  selected with Playwright `--grep`.
- No second unit-test runner is added.
- The initial framework files use the exact paths listed in the file-boundary
  section, including `settings-panel.ts` and the `settings/` command folder.
- The exemplar tests EX-1, EX-1b, EX-1c, and EX-2 through EX-5 are part of the
  deliverable as real, executable tests, and their required commands are built
  as part of the framework rather than deferred.
- The existing `home.spec.ts` location and observable assertions are retained
  during migration.
