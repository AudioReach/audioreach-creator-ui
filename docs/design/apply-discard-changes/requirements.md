# Apply / Discard Changes — Requirements

**Date:** 2026-07-23
**Status:** Frozen

---

## 1. Context

### 1.1 Problem statement

When a user edits an audio processing graph in the graph designer, the edits accrue
as uncommitted changes in an active backend edit-session. The user needs a way to
**Apply** those edits (reconcile, review, and commit them, returning to READONLY) or
**Discard** them (drop everything and return to READONLY). This feature owns
everything that happens **after** the user clicks **Apply Changes** or **Discard
Changes**, up to and including the return to READONLY. READONLY is not a startable
session mode — it is the implicit no-session state a project begins in and returns
to; `end-session` is the sole mechanism that returns a project to it, for both Apply
and Discard.

### 1.2 What this builds on

- The backend modification framework: `create-usecases`, `stage-changes`,
  `discard-changes`, `end-session`. Apply finalizes through `end-session` rather than the
  partial `commit-changes` / `unstage-changes` flow, and the review dialog is
  populated entirely from the `create-usecases` response, whose rows each carry a
  `changeId`. `preview-changes` is not used (not currently planned).
- Existing graph-designer store scaffolding: `selectedUsecases`,
  `loadGraphData(usecases)`, `isDirty` / `markClean` / `markDirty`.
- The `use-project-saver` hook pattern for project-level operations (toast,
  structured logging). Re-entrancy is handled by the store's `withMutationLock`
  serial guard rather than a hook-local ref.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| Edit-session | Backend state holding uncommitted changes. Ended only by `end-session` → READONLY. This feature never starts one. |
| Routing-trigger flag | Frontend boolean (mirrors legacy `IsRoutingTriggered`, A5), set true by out-of-scope edit code when a *routing-relevant edit* — one that can create/change usecases (module add/remove, link add/remove, etc.) — occurs. Selects the Apply branch (FR-AD-02): true → reconcile/review pipeline; false → commit the auto-staged edits and end. Distinct from `isDirty`, which tracks whether *any* edit (routing or not) is unsaved and gates Apply availability (FR-AD-01) and the discard confirmation (FR-AD-13). |
| Non-routing edit | An edit that changes a property without affecting routing (e.g. module alias change, subgraph name change); does not set the routing-trigger flag. |
| Summary dialog | "Graph Modification Summary" — checkbox lists of created / updated / deleted usecases, populated from the `create-usecases` response. Checked selection = the staging set. |
| Staging set | Usecases the user leaves checked → staged (by `changeId`) → committed. Unchecked → cleared by `end-session`. |
| Navigation choice | Post-Apply canvas-view update (keep / add / switch), affecting `loadGraphData` inputs only, never staging (FR-AD-06). |
| READONLY | The implicit "no active session" state. Not a startable mode — a project begins here and returns here when its session ends. |
| Issue severity | `create-usecases` issue category: `BLOCKING`, `NON_BLOCKING`, or `DATA_LOSS`. |

---

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-AD-01 | Apply is available only while a session is active with unsaved changes; otherwise disabled. |
| FR-AD-02 | On Apply, the routing-trigger flag selects the branch: routing-relevant edits (flag true) run the reconcile/review pipeline; non-routing-only edits (flag false) skip review and finalize by committing the auto-staged edits, then ending the session. |
| FR-AD-03 | The reconcile step validates the edits and returns the set of usecase changes to review. |
| FR-AD-04 | Issues that are blocking (`category` BLOCKING, or `severity` FATAL/ERROR) abort Apply; non-blocking and backend-acknowledged data-loss issues are shown but the user may proceed. |
| FR-AD-05 | The review dialog lists created/updated/deleted usecases, all selected by default; empty categories are hidden. |
| FR-AD-06 | When new usecases are created, the user chooses how the canvas selection updates (keep / add / switch); hidden otherwise. |
| FR-AD-07 | Confirming stages the selected usecases, commits all staged changes (with validation enforced), and ends the session; cancelling returns to editing unchanged. Confirming with no usecases selected still attempts the commit/end-session — the backend may reject it (e.g. modules added but attached to no committed usecase), which surfaces as a reportable error and leaves the session active for the user to correct. |
| FR-AD-08 | When reconciliation yields no usecase changes, Apply skips the review dialog and finalizes by committing the auto-staged edits, then ending the session. |
| FR-AD-09 | A reportable finalize-call business error — from Apply's `stage-changes` / `commit-changes` / `end-session`, or Discard's `discard-changes` / `end-session` — keeps the session active with the pending changes intact; the user may correct the cause and retry, or discard. |
| FR-AD-10 | An indeterminate finalize failure — a transport failure on a mutating call, where no response is received — leaves the outcome unknown: stay in edit mode, assert nothing, let the user reload to see actual state. |
| FR-AD-11 | Any other pipeline failure surfaces the error and leaves the session active and dirty. |
| FR-AD-12 | Discard is available whenever a session is active, regardless of unsaved changes; it is the guaranteed path back to READONLY. |
| FR-AD-13 | Discard requires a danger confirmation only when unsaved changes exist; a clean session ends without confirmation. Once confirmed, discard is unconditional. |
| FR-AD-14 | Discard drops all pending changes and ends the session, returning to READONLY. |
| FR-AD-15 | After a successful Apply or Discard, the graph reloads and dirty state clears; Apply honors the user's navigation choice. |
| FR-AD-16 | Backend-reported issues (from `create-usecases`) and reportable finalize-call business errors — Apply's `stage-changes` / `commit-changes` / `end-session` and Discard's `discard-changes` / `end-session` — are presented in the validation-result-view, and that tab is brought into focus; terminal operation status is surfaced via toast. |

---

## 4. Invariants

**I1 — No misrepresented state (pre-commit vs post-commit).** The frontend never claims
an outcome it cannot confirm, and it never lands in a state it silently hides.

*Pre-commit (nothing applied).* On a determinate failure that commits nothing — a
`create-usecases` BLOCKING issue, a `stage-changes` failure/partial (which stops before
commit), or a `commit-changes` **rejection** (`400` invalid input / missing dependencies,
or `422` validation failure, where no change is applied) — the session remains active and
the graph is unmodified from the user's perspective. A rejected `commit-changes` leaves
its changes staged (the backend does not auto-roll-back a rejected commit); the user
retries or discards.

*Partial commit (some applied).* A `commit-changes` that returns `success: true` with a
non-empty `failedChangeIds` (or otherwise reports a partial result) has **already durably
committed** its `processedChangeIds` while the `failedChangeIds` remain staged. This is
**not** "graph unmodified": part of the user's edit is live. The frontend treats it as a
stop before `end-session` (the still-staged set would `422`), does **not** call
`markClean`, keeps the session active, and surfaces the reported split so the user can
retry the remainder, discard, or reload to reconcile according to the reported state. I2
still holds — each change is either committed or staged, never both.

*Post-commit (all applied).* A *fully successful* `commit-changes` is durable and drains
the staged set, so the following `end-session` can no longer `422 STAGED_CHANGES_EXIST` on
the normal path (a `422` there can only follow a *partial* commit, handled above). The one
window that remains is a **transport failure on `end-session` after a successful commit**:
the changes are committed but the READONLY transition is unconfirmed — a real
*committed-but-session-active* state. The frontend does not treat this as lost work or as
ended-but-not-committed; it retries `end-session`, and because the original call may
already have ended the session, it treats a retry `200 READONLY` as success and a retry
`400 no active session` (or any other contradictory determinate state) as a cue to
**reload/reconcile** rather than proof the session is still active. The project therefore
never lands ended-but-not-committed, and the only state the frontend cannot immediately
assert is this transport window, which it defers to a user-driven reload (FR-AD-10) rather
than misrepresenting.

**I2 — Commit XOR clear:** A usecase change is either staged-then-committed or
cleared — never both. Unchecked summary rows are never committed.

**I3 — Single in-flight operation:** At most one Apply or Discard operation runs at
a time (see NFR-AD-01).

---

## 5. Non-Functional Requirements

**NFR-AD-01 — Single in-flight operation:** While an Apply or Discard operation is
running, the UI presents a blocked/busy state (Apply and Discard disabled) until the
session returns to READONLY or the operation aborts. Because button state updates
asynchronously, the store's synchronous `withMutationLock` serial guard rejects an
overlapping invocation regardless of render timing.

**NFR-AD-02 — Observability:** Each backend call and each terminal outcome
(success, abort, error) is logged with action + component context via
`~shared/lib/logger`, and user-facing outcomes are surfaced via toast.

---

## 6. Assumptions & design seams

Settled for design purposes but resting on assumptions or on state produced by
out-of-scope code. Each names the seam this design consumes.

- **A1 — `discard-changes` removes staged *and* unstaged changes.** Discard-all (no
  `changeIds`) clears everything uncommitted, staged included, and cascades to
  dependents. The subsequent `end-session`
  therefore sees nothing staged and returns to READONLY without a `422`.
- **A2 — `activeSubgraphs` (subgraphs + their selected KV cases) are derived from
  the edit-session slice at Apply time.** The slice exposes `kvSelectionsById`
  (`Record<subgraphId, KvSelection[]>`); this design filters each subgraph's selections
  by `selected` and maps them to the wire shape. The slice's population is out-of-scope
  edit-mode state; this design consumes it via a seam.
- **A3 — Excluded links are derived from the edit-session slice's `excludedLinks`.**
  The slice exposes `excludedLinks: Connection[]`; this design partitions them by
  `connectionType` into `excludedDataLinkSystemIds` / `excludedControlLinkSystemIds`
  (`Connection.connectionId` is the backend link system-id). No exclusion UI in this
  task. Same seam as A2.
- **A4 — Non-routing edits are auto-staged and finalized by `commit-changes`.**
  `end-session` does not commit — it discards unstaged changes and `422`s on staged
  leftovers. Non-routing edits (alias change, subgraph
  rename) are auto-staged by the backend on success, so the flag-false branch finalizes
  by calling `commit-changes` (no `changeIds` → commits all staged) then `end-session`.
  The frontend never needs the individual non-routing `changeId`s.
- **A5 — The routing-trigger flag is provided by out-of-scope edit code.** This design
  defines the contract (a frontend boolean mirroring `IsRoutingTriggered`) and only
  consumes it.
- **A6 — Determinate finalize errors are distinguishable; the indeterminate case is
  transport-only.** `end-session`'s `400` means purely "no active session" and
  `422 STAGED_CHANGES_EXIST` is its own code, so backend finalize
  failures are determinate and leave the session active by the backend's own guarantee.
  The only case the frontend cannot reconcile is a transport failure on a mutating call
  (no response received), which drives FR-AD-10. No session-status read endpoint exists
  to reconcile even that; recovery stays user-driven.
- **A7 — `create-usecases` issues carry consistent `severity` and `category`.** The
  reconcile response's issues expose both a required `severity`
  (FATAL/ERROR/WARNING) and an optional `category` (BLOCKING/NON_BLOCKING/DATA_LOSS).
  We assume the backend sets them coherently — no BLOCKING issue at WARNING severity,
  no FATAL/ERROR issue marked NON_BLOCKING — so the FR-AD-04 gate (block on
  `category` BLOCKING **or** `severity` FATAL/ERROR) is well-defined. _Revisit the
  gate if contradictory combinations are observed in practice._
- **A8 — The validation-result-view panel is mounted in the project layout.** Its tab
  is mounted (and its layout node-id discoverable) by separate layout work; this
  feature populates the panel and focuses its tab but does not mount it. Same seam
  pattern as A2/A3.
- **A9 — Staging is retried by not-yet-staged id, not assumed idempotent.** The
  `stage-changes` swagger does not document whether re-staging an already-staged
  `changeId` is a success/no-op or an error. This design does **not** assume idempotency:
  after a partial stage, retry re-stages only the selected ids not present in the failed
  attempt's `processedChangeIds` (`checked − processed`). If the backend later confirms
  that staging an already-staged id is a success/no-op, the retry can be simplified to
  re-sending the whole checked set; until then the coordinator tracks `processedChangeIds`
  so the retry set is unambiguous.
- **A10 — "Commit all / discard all" is expressed by omission, never `[]`.** The
  `commit-changes` and `discard-changes` swagger treat `changeIds` *not provided or empty*
  as "all". This design expresses "all" solely by **omitting** `changeIds` (passed as
  `undefined`, dropped from the JSON body by `JSON.stringify`) and never intentionally
  sends `[]`. The frontend invariant holds regardless of the backend's empty-array
  handling, so a later backend that rejects empty arrays cannot break this feature.

---

## 7. Out of Scope

- Entering edit mode / `start-session`.
- The edits themselves (`spf-modules`, `data-links`, `control-links`, etc.).
- `preview-changes` API (not currently planned).
- `unstage-changes` and partial `commit-changes` (committing a subset by `changeId`).
  This feature commits all staged changes in one sweep (no `changeIds`); selective
  unstaging and per-`changeId` partial commits are not used.
- Link-exclusion UI (A3 — fields sourced from a store, default empty).
- Subsystem-filtered usecase sections in the summary dialog. The dialog's sections
  are data-driven from the `create-usecases` response (FR-AD-05); since the response
  does not currently contain subsystem-filtered categories, those sections will not
  be exercised or tested in this task, and will be added when the API returns them.
- Closing a project tab (or the app) while a session is active with unsaved changes.
  That path should prompt for confirmation and take appropriate action, but it is
  owned by the tab-close flow, not this feature — this task scopes only what happens
  *after* Apply or Discard is clicked.

---

## 8. Resolved decisions (history)

Recorded for traceability; these were open questions during requirements gathering
and are now closed.

- **Summary source & stageable id** — the summary dialog is populated from the
  `create-usecases` response, which returns `created` / `updated` / `deleted` rows
  each carrying a `changeId`. Staging keys off `changeId`.
- **Subsystem-filtered sections** — the summary dialog is data-driven from the
  `create-usecases` response. The response does not currently distinguish
  subsystem-filtered usecases, so those sections are deferred (§7) and added when
  the API returns them.
- **Finalize sequence** — `end-session` does not commit; it discards unstaged changes
  and `422`s if any staged changes remain. So Apply finalizes with
  `stage-changes` (checked usecases) → `commit-changes?enforceValidation=true` (no
  `changeIds` → commits all staged) → `end-session`. The `enforceValidation` flag runs
  the backend's commit-group validation rules, which is what surfaces cases like
  "modules added but attached to no committed usecase."
- **Finalize failure** — a reportable business error (a `stage-changes` failure/partial
  that stops before commit, `commit-changes` `400`/`422`, or `end-session`
  `422 STAGED_CHANGES_EXIST` / `400`) keeps the session active with the pending changes
  intact for the user to correct and retry (FR-AD-09, I1). A rejected commit leaves all its
  changes staged (no auto-rollback); a partial commit durably commits `processedChangeIds`
  and leaves only `failedChangeIds` staged. An *indeterminate* failure — a transport failure on a
  mutating call, where no response is received — leaves backend state unknown; the frontend
  asserts neither outcome and defers to a user-driven reload (FR-AD-10, A6). The one
  refinement is a transport failure on `end-session` *after* a successful commit: the
  commit is durable, so the frontend retries `end-session` and treats a retry
  `400 no active session` as a cue to reload/reconcile — not proof the session is still
  active (I1 post-commit). No session-status endpoint exists to reconcile automatically.
- **No-routing branch** — skip `create-usecases`/dialog and finalize without
  confirmation by calling `commit-changes?enforceValidation=true` (no `changeIds`) to
  commit the auto-staged non-routing edits, then `end-session` (FR-AD-02, A4).
- **Empty reconciliation** — when `create-usecases` returns empty usecase arrays with
  `success: true`, skip the summary dialog and finalize (commit all staged →
  end-session); this can happen even under a true routing-trigger flag when edits cancel
  out (FR-AD-08).
- **OK with nothing checked** — OK always attempts finalize (stage nothing →
  `commit-changes?enforceValidation=true` → `end-session`); it never collapses into a
  no-op or into Cancel. When no usecases are checked, the backend may reject the commit
  (e.g. modules added but attached to no committed usecase); that reportable error keeps
  the session active so the user can remove the orphan modules or reopen Apply and check
  a usecase (FR-AD-07).
- **Discard gating** — Discard is available whenever a session is active, *not*
  gated on `isDirty` (FR-AD-12). An earlier revision gated Discard on `isDirty`
  just like Apply. That was a dead end: the buttons form a swap — `Edit` starts
  the session and is replaced by `Apply`/`Discard` for its duration, so those two
  are the *only* controls visible while a session is active. Gating both on
  `isDirty` leaves a clean session (started but not yet edited) with no enabled
  exit, trapping the user. Discard must therefore stay enabled whenever a session
  is active; a clean discard ends the session without a confirmation prompt
  (FR-AD-13), since there is nothing to lose.
- **DATA_LOSS severity** — a backend-acknowledged data-loss issue is surfaced as a
  validation error the user may ignore and proceed (or discard); it gates like
  `NON_BLOCKING` and is distinct from an indeterminate finalize failure (FR-AD-04).
- **READONLY transition** — READONLY is the implicit no-session state, not a
  startable mode. `end-session` is the sole return path, used by both Apply and
  Discard.
- **Post-apply navigation choice** — in scope (FR-AD-06).
