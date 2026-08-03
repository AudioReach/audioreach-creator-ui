# Edit Mode Toggle: Design

Requirements: [requirements.md](./requirements.md)

---

## 1. Overview

The Edit action transitions a project's session from tuning to designer
and sets `editModeState` to `'edit'`. Once Apply or Discard's own staging,
commit, or discard operations finish — which already end that session as
their own last step — the session is returned to tuning and
`editModeState` is set back to `'view'`. Both transitions — into edit mode
and back out of it — are built here.

The design has four parts:

1. Paired operations that move the session between tuning and designer.
2. Orchestration that combines those operations with the project's
   exclusive workflow lock, for both entering and exiting edit mode.
3. Where that orchestration is invoked from — Edit, Apply, and Discard.
4. `editModeState`, a project-scoped field that any part of the
   application reads independently to determine its own editable/
   read-only behaviour.

---

## 2. Session-mode transitions

**File:** `entities/edit-session/api/edit-session-api.ts`

`startSession` starts a new session in a given mode:

```ts
export async function startSession(
  projectId: string,
  mode: SessionMode,
): Promise<ApiResult<SessionResponseDto>> {
  return httpClient.post<SessionResponseDto>(
    `/projects/${projectId}/start-session`,
    {mode},
  );
}
```

`endSession` ends the current session, alongside the existing edit
session operations (staging, committing, discarding) that already use it
— it is not introduced by this feature and is not changed here.

Ending a session and starting one in a target mode are separate calls.
Composing them into a full transition — which calls to make, in what
order — is each caller's responsibility (section 3).

`enterEditMode` additionally consumes `getProjectById`
(`entities/project/api/projects-api.ts`), an existing, unmodified call
that returns a `ProjectInfoResponseDto` with the project's current
`sessionMode`. It is used only as a fallback when `endSession` fails,
to determine whether the session had already ended (section 3).

---

## 3. Edit orchestration

**File:** `features/graph-designer/model/edit-session-slice.ts`

Entering and exiting edit mode are `enterEditMode` and `exitEditMode`,
each combining the project's exclusive workflow lock, the session-mode
operations from section 2, and `editModeState` from section 5.

**`enterEditMode: () => Promise<boolean>`**

1. Set the exclusive workflow lock to `usecase-edit`. If unavailable
   (already held by another mode), stop and return `false` (FR-01).
2. Call `endSession`. If it fails, for any reason, query
   `getProjectById(projectId)` to check the project's current
   `sessionMode` (FR-04):
   - `sessionMode === 'READONLY'` → `endSession` has already taken
     effect, possibly from an earlier attempt; treat it as succeeded and
     continue to step 3.
   - Any other `sessionMode` → `endSession` genuinely failed. Release
     the lock, return `false` — `editModeState` is not touched.
   - If the `getProjectById` query itself fails, treat it the same way:
     release the lock, return `false` — `editModeState` is not touched.
3. Call `startSession(projectId, Designer)` (FR-02). If it fails, release the
   lock, return `false` — `editModeState` is not touched. The backend
   session is left in READONLY rather than the mode requested; this
   still counts as one failed transition here, and no further recovery
   is attempted.
4. Set `editModeState` to `'edit'` (FR-03) and return `true`.

Acquiring the lock first avoids an avoidable network call when another
exclusive workflow is already active. Failure is signalled only via the
`false` return — the caller toasts, not this function (see section 6).
The `getProjectById` fallback exists because `endSession` failing does
not by itself distinguish "nothing happened" from "the session had
already ended, and this call is redundant" — querying `sessionMode` is
the only way to tell the two apart.

**`exitEditMode: () => Promise<boolean>`**

1. Call `startSession(projectId, Tuning)`. If it fails, return `false` —
   the lock and `editModeState` are left as they are.
2. Release the exclusive workflow lock.
3. Set `editModeState` back to `'view'` (FR-08) and return `true`.

No `endSession` call here: Apply and Discard already end the session as
the last step of their own staging, commit, or discard sequence before
triggering this (see `docs/design/apply-discard-changes/`). Same failure
signalling as `enterEditMode`.

---

## 4. Invoking the orchestration

Edit, Apply, and Discard are adjacent buttons in an `ApplyDiscardControls`
container, next to `UsecaseSelectionControl` in the graph designer's top
bar. Edit's enabled state is defined below; Apply's and Discard's own
visibility and enablement are owned separately, by
`docs/design/apply-discard-changes/`.

**Edit's enabled state.** `Edit` is enabled when the project's exclusive
workflow lock is free: `activeExclusiveMode === 'none'` (FR-01). It
reads this directly from the project store
(`shared/store/project-store-slices/exclusive-lock-slice.ts`), the same
way panels read `editModeState` directly in section 5 — no prop, no
subscription to this feature's own state. Whenever any exclusive
workflow (`usecase-edit`, `diff-merge`, `discovery-wizard`) holds the
lock, `Edit` is disabled — including the case where an edit session is
already active, since starting one holds `usecase-edit`.

**Edit:** `onClick` calls `enterEditMode`.
- On `true`: no further action — `editModeState` is now `'edit'`.
- On `false`: show a generic error toast ("Couldn't start edit mode").
  `editModeState` was left untouched.

**Apply and Discard:** once their own staging, commit, or discard
sequence (out of scope here, see requirements §1.2) reports success,
`features/graph-designer/hooks/use-apply-discard.ts` calls `exitEditMode`,
awaiting it now that it is asynchronous.
- On `true`: no further action — `editModeState` is now `'view'`.
- On `false`: show a generic error toast ("Couldn't exit edit mode"), in
  addition to whatever success toast Apply/Discard's own sequence already
  showed for its own outcome (e.g. "Changes applied"). The session
  remains in edit mode until exiting is retried successfully.

---

## 5. editModeState

**Files:** `shared/store/project-store.ts`, `shared/store/project-store.types.ts`

`editModeState` is project-scoped state, alongside the project's
exclusive-lock state, since both describe the same project-level session
at the same layer.

**Shape:**

```ts
editModeState: 'view' | 'edit';
setEditModeState: (state: 'view' | 'edit') => void;
```

`'view'` is the initial value. The orchestration in section 3 is the only
code that calls `setEditModeState` — no other caller sets this field
directly.

Each of the following reads `editModeState` directly from the project's
state, independently of every other panel and independently of the
orchestration that sets it (FR-05, FR-07):

- Key configurator
- Module list
- Subgraph list
- Properties view
- Graph designer
- Any future panel

No panel receives this value as a prop, and no panel is called or invoked
to update it — each panel drives its own editable/read-only rendering from
what it reads (FR-06). This mirrors how other project-scoped fields, such
as the exclusive workflow lock itself, are already read directly by
independent parts of the application. How each panel implements its own
switching behaviour is outside this design's scope (see requirements,
§1.2).

---

## 6. Failure handling

`enterEditMode` and `exitEditMode` return `false` on every failure case
described in section 3. The caller shows a generic error toast (e.g.
"Couldn't start edit mode" / "Couldn't exit edit mode") via `showToast`
(`shared/controls/global-toaster`), not raw backend error detail.

An `endSession` failure inside `enterEditMode` is not immediately shown
as an error — the `getProjectById` fallback (section 3) may resolve it
as an already-completed transition, in which case entry proceeds
normally with no toast for that intermediate failure. Only a fallback
that confirms the session did *not* end (or a failed `getProjectById`
call itself) produces the generic error toast.

Exiting runs only after Apply or Discard already succeeded, so a failed
`startSession(Tuning)` on exit follows the caller's own success toast for
that outcome (e.g. "Changes applied"). The changes stand; only the
return to tuning did not complete, and the session stays in edit mode
until exiting is retried — the caller's second toast reflects that.
