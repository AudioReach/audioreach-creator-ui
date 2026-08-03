# Edit Mode Toggle: Requirements

---

## 1. Context

### 1.1 Problem statement

A project's session can be in different modes (read-only, tuning, designer,
and others). Users need an explicit way to move from the tuning mode into
an editable one, and back again once they are done. This feature defines
that transition: an Edit action that starts an editable session, and an
edit-active state that signals to the rest of the application whether
editing is currently allowed.

Within the area this feature operates in, a session is never observed in
the read-only mode from the UI's perspective — a read-only session
automatically transitions to tuning before the user can interact with it.
Tuning is therefore the only session mode this feature needs to treat as
a starting point for usecase edit.

### 1.2 Scope

This feature covers:

- Determining when the Edit action is available, based on whether any
  exclusive workflow is currently active for the project.
- What happens when Edit is triggered — starting an editable session and
  establishing an edit-active state.
- Making that edit-active state available for other parts of the
  application to read.
- Returning to a non-edit state when editing ends.

This feature does not cover:

- The behaviour of Apply and Discard actions, or what happens after a user
  chooses to apply or discard changes. That belongs to a separate feature.
- Implementing how each consuming panel — key configurator, module list,
  subgraph list, properties view, graph designer — reacts to the
  edit-active state. Those panels are expected to read this state and
  switch their own editable/read-only behaviour accordingly, but that
  panel-level work is separate from this feature.
- Any workflow other than the standard edit session (e.g. diff/merge,
  discovery wizard) — this feature only needs to know that such workflows
  are mutually exclusive with editing, not implement them.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| Session mode | The current mode of a project's session (e.g. read-only, tuning, design, and other modes not relevant to this feature). |
| Edit session | The period during which a project's session is in an editable mode, started by the Edit action and ended by Apply or Discard. |
| Edit-active state | Whether an edit session is currently active for a project. This is what other panels read to decide their own editable/read-only behaviour. |
| Exclusive workflow | Any session-level workflow that must not run concurrently with another (e.g. usecase edit, diff/merge, discovery wizard, or any other such workflow). At most one is active per project at a time. |

---

## 3. Functional Requirements

### 3.1 Edit availability

| ID | Requirement |
|----|-------------|
| FR-01 | Edit is clickable only when the exclusive workflow is none. |

### 3.2 Entering edit mode

| ID | Requirement |
|----|-------------|
| FR-02 | Triggering Edit sets the exclusive workflow to usecase-edit and starts a session in designer mode. |
| FR-03 | If entry succeeds, the edit-active state is set to active. |
| FR-04 | If entry fails because ending the prior session failed, the frontend checks whether that end had already taken effect by querying the project's current session mode. If confirmed, entry continues as if ending had succeeded. Otherwise — including if that check itself fails — the edit-active state remains inactive and the user is shown an error. |

### 3.3 Edit-active state propagation

| ID | Requirement |
|----|-------------|
| FR-05 | The edit-active state must be readable by any interested part of the application independently — without being called or invoked by this feature. |
| FR-06 | Key configurator, module list, subgraph list, properties view, and graph designer each read the edit-active state to determine their own editable/read-only behaviour. Implementing that behaviour in each panel is out of scope for this feature (see 1.2). |
| FR-07 | Adding or removing a consumer of the edit-active state requires no change within this feature. |

### 3.4 Exiting edit mode

| ID | Requirement |
|----|-------------|
| FR-08 | When Apply or Discard complete successfully (their own staging, commit, or discard behaviour, including ending the edit session, is outside this feature's scope), this feature starts a tuning-mode session, sets the exclusive workflow to none, and sets the edit-active state back to inactive. |
| FR-09 | If starting that tuning-mode session fails, the exclusive workflow stays set to usecase-edit and the edit-active state remains active; the user is shown an error. Apply or Discard's own success is not affected or reversed by this failure. |

---

## 4. Invariants

| ID | Invariant |
|----|-----------|
| I1 | The edit-active state is active if and only if an edit session is currently held for the project. |
| I2 | At most one exclusive workflow (e.g. usecase edit, diff/merge, discovery wizard) is active per project at any time — none of them being active is also a valid state. |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | The number of consumers of the edit-active state is not a performance concern at current or expected scale. |
