# Manual Usecase: Requirements

**Date:** 2026-10-09
**Status:** Frozen

---

## 1. Context

### 1.1 Problem statement

Users need to compose a manual usecase by explicitly choosing the subgraphs
that belong to it. The graph must make selection and removal clear, retain that
composition while the user edits, and let the user review the resulting manual
usecases before they are committed.

### 1.2 What this builds on

- The graph designer's subgraph quick-menu controls.
- The existing Apply and Discard edit-session controls.
- The manual-GKV backend endpoint:
  `POST /arc-api/v1/projects/{projectId}/create-manual-usecases`.

### 1.3 Key decisions already made

- A manual GKV cache holds the selected subgraphs in the background.
- The cache is not shown as a dedicated UI element.
- A subgraph's quick menu is the sole selection affordance: `+` adds it to the
  cache and `-` removes it.
- Users can drill into subsystems and select their contained subgraphs for the
  manual GKV cache.
- Apply invokes the manual-GKV backend API only when the cache is non-empty.
- A successful Apply or Discard clears the manual GKV cache.
- A new manual-usecase request sends an empty `selectedUsecaseSystemIds`
  array; a manual-usecase edit request uses the edited usecase's system ID from
  the usecase-selection control.
- Manual usecases returned for review are selected by default and can be
  individually excluded before commit.
- When editing a manual usecase, each subgraph already belonging to that
  usecase displays the remove (`-`) quick-menu action.

## 2. Definitions

| Term                     | Definition                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Apply                    | The existing edit-session action that submits the current manual selection when one exists.                                  |
| Manual GKV cache         | Transient client-side state containing subgraphs selected for a manual usecase. It is not displayed independently in the UI. |
| Manual-GKV API           | `POST /arc-api/v1/projects/{projectId}/create-manual-usecases`. It receives selected usecase IDs, active subgraphs, and optional exclusions. |
| Manual usecase edit mode | The graph state entered when the user edits an existing manual usecase.                                                      |
| Manual usecase summary   | The review view listing manual usecases returned by the manual-GKV API before commit.                                        |
| Subsystem level          | A graph level reached by drilling into a subsystem, where the subsystem's contained subgraphs are visible.                  |
| Usecase-selection control | The existing control that supplies the edited manual usecase's system ID for a manual-usecase edit request.                |

## 3. Manual-GKV API Contract

The request requires `selectedUsecaseSystemIds` and `activeSubgraphs`.
Each active-subgraph entry supplies its `systemId` and `valueSystemIds` as an
array of SGKV-combination arrays. The request can optionally include
`excludedDataLinkSystemIds`, `excludedControlLinkSystemIds`, and
`excludedSubgraphSystemIds`.

A new manual-usecase request sends `selectedUsecaseSystemIds: []`. A
manual-usecase edit request sends the system ID of the usecase selected for
editing in the usecase-selection control.

The response contains `changes`, `issues`, and `groupId`. Its `changes` are
the source for the Manual Usecases review section. Invalid nested SGKV value
IDs receive HTTP 400, a missing active session receives HTTP 403, and a manual
data-link cycle receives HTTP 422 with issue code
`ARC-ROUTING-MANUAL-CYCLE`.

## 4. Functional Requirements

### 4.1 Select subgraphs for a manual usecase

#### FR-MUC-01: Show the add action

For every eligible subgraph that is absent from the manual GKV cache, the
subgraph quick menu shall show an add (`+`) action.

#### FR-MUC-02: Add a subgraph

When the user selects a subgraph's add action, the application shall add that
subgraph to the manual GKV cache and replace its quick-menu action with remove
(`-`).

#### FR-MUC-03: Show the remove action

For every subgraph present in the manual GKV cache, the subgraph quick menu
shall show a remove (`-`) action instead of an add action.

#### FR-MUC-04: Remove a subgraph

When the user selects a subgraph's remove action, the application shall remove
that subgraph from the manual GKV cache and restore its add (`+`) action.

#### FR-MUC-05: Hide cache internals

The application shall not display the manual GKV cache, its count, or a
separate list of selected subgraphs outside the quick-menu state on each
subgraph.

#### FR-MUC-06: Retain composition during an edit session

The application shall retain the manual GKV cache while the current edit
session remains active, including while the user makes other graph changes.

#### FR-MUC-07: Select subgraphs inside subsystems

When a user drills into a subsystem level, every eligible subgraph visible at
that level shall expose the manual-usecase quick-menu action. The user shall be
able to add or remove that subgraph from the manual GKV cache through the same
`+` and `-` behavior used at other graph levels.

#### FR-MUC-08: Preserve membership across subsystem navigation

The manual GKV cache shall retain subgraph membership while the user drills into
or out of subsystems. When a previously visited subsystem level is shown again,
each subgraph's quick-menu action shall reflect its retained cache membership.

#### FR-MUC-09: Reflect manual membership during manual-usecase edit

When the user enters manual usecase edit mode, the application shall initialize
the manual GKV cache with the subgraphs belonging to the manual usecase being
edited. Each such subgraph shall show the remove (`-`) quick-menu action in the
top-right corner of its subgraph header.

#### FR-MUC-10: Clear cache after a completed session

After a successful Apply or Discard completes, the application shall clear the
manual GKV cache. When the graph is next shown, affected subgraphs shall expose
the add (`+`) quick-menu action unless a new manual-usecase edit mode
initializes them as members.

### 4.2 Submit a manual usecase

#### FR-MUC-11: Set new-manual-usecase context

When submitting a new manual usecase, the application shall send
`selectedUsecaseSystemIds: []` in the manual-GKV request.

#### FR-MUC-12: Set manual-usecase edit context

When submitting a manual-usecase edit, the application shall read the edited
manual usecase's system ID from the usecase-selection control and send it as
the sole entry in `selectedUsecaseSystemIds`.

#### FR-MUC-13: Submit a non-empty manual selection

When the user selects Apply and the manual GKV cache is non-empty, the
application shall invoke the manual-GKV API with the current cached selection
as `activeSubgraphs`, the required `selectedUsecaseSystemIds`, and any
applicable optional exclusions.

#### FR-MUC-14: Skip empty manual submission

When the user selects Apply and the manual GKV cache is empty, the application
shall not invoke the manual-GKV API.

#### FR-MUC-15: Handle manual API failure

If the manual-GKV API reports a failure, including a 400 invalid SGKV request,
403 missing active session, or 422 manual-cycle response, the application shall
present the returned issues and retain the active edit session and manual GKV
cache so the user can correct the selection or discard the session.

#### FR-MUC-16: Halt on Apply backend error

If any backend call made during Apply or a manual-usecase update reports an
error, the application shall halt the workflow at that point. It shall not
stage, commit, end the edit session, clear the manual GKV cache, or invoke a
subsequent API in the current Apply attempt. The graph shall remain in edit
mode so the user can correct the issue or discard the session.

### 4.3 Review manual usecases

#### FR-MUC-17: Show manual creation results

When the manual-GKV API returns one or more reviewable items in `changes`, the
application shall show them in a Manual Usecases section before commit.

#### FR-MUC-18: Select results by default

Every manual usecase in the review section shall have a checkbox and shall be
checked when the section first opens.

#### FR-MUC-19: Exclude a result from commit

The user shall be able to uncheck any manual usecase in the review section. An
unchecked manual usecase shall not be committed when the user confirms the
review.

## 5. Invariants

**I1 — Quick-menu accuracy:** A subgraph shows `+` if and only if it is absent
from the manual GKV cache; it shows `-` if and only if it is present.

**I2 — Hidden cache:** The manual GKV cache is background state and is never
rendered as a cache panel, count, or independent selection list.

**I3 — Explicit commit selection:** A manual usecase that is unchecked in the
review section is not committed.

**I4 — Edit membership visibility:** In manual usecase edit mode, every
subgraph belonging to the edited manual usecase displays `-` in its top-right
quick menu.

**I5 — Navigation-independent membership:** Navigating between subsystem
levels never adds, removes, or otherwise changes a subgraph's manual GKV-cache
membership.

**I6 — Terminal cleanup:** A successful Apply or Discard leaves the manual GKV
cache empty.

**I7 — Request context:** A new manual-usecase request has an empty
`selectedUsecaseSystemIds` array; a manual-usecase edit request contains only
the edited manual usecase's system ID.

**I8 — Backend-error halt:** A backend error during Apply or manual-usecase
update leaves the graph in edit mode with the manual GKV cache intact and no
subsequent API operation attempted in that Apply attempt.

## 6. Non-Functional Requirements

**NFR-MUC-01:** The quick-menu action shall change immediately after an add or
remove operation.

**NFR-MUC-02:** The application shall prevent duplicate cache entries for the
same subgraph.

**NFR-MUC-03:** Manual-selection state and API failures shall be logged with
action and component context, and failures shall be visible to the user.

**NFR-MUC-04:** The controls shall use existing QUI components, design tokens,
and keyboard-accessible interaction patterns.
