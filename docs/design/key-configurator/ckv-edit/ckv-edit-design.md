<!--
Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
SPDX-License-Identifier: BSD-3-Clause
-->

# Calibration Key Vector Edit: Design

Requirements: [requirements.md](./requirements.md)

**Date:** 2026-09-15  
**Status:** Draft for review

## 1. Scope and goals

This design covers CKV Add and Edit behavior for module instances in the Key
Configurator. It also covers duplicate prevention, module-wide PID support, and
independent vertically stacked panels when multiple modules are selected with
Ctrl+Click.

The implementation extends the existing CKV feature and configurator-panel
patterns. It does not introduce a new backend persistence contract, change
Module Tag behavior, or change graph/subgraph key-vector behavior.

## 2. Design decision

### 2.1 Decision

Extend the existing CKV store and panels in place, and reuse
`ConfiguratorPanel` for multi-module layout. Add pure CKV identity helpers and
one atomic store mutation for Add/Edit.

This keeps the change within the existing Feature-Sliced Design boundaries:

- CKV state and UI remain in `features/key-configurator`.
- Generic selected-item layout remains in `widgets/configurator-panel`.
- CKV comparison logic is pure feature logic and has no React or store
  dependency.

### 2.2 Alternatives considered

**Dedicated CKV session store:** Move every draft, selection, and validation
state into a new Zustand store. This would centralize the workflow, but would
duplicate the existing panel-local draft state and increase the migration
surface.

**Parent-owned batch state:** Lift every module's CKV draft into
`KeyConfiguratorPanel` and pass it to each child panel. This would make batch
coordination explicit, but would create prop coupling between the widget and
the feature UI.

The in-place extension is preferred because the current UI already renders
selected items vertically and already implements most CKV interactions.

## 3. State ownership and data model

### 3.1 Module-instance identity

All module-scoped CKV state is addressed by a composite module-instance key:

```text
moduleInstanceKey = moduleDefinitionId + ":" + instanceId
```

The numeric module definition ID alone is not sufficient because two instances
of the same definition can be selected at the same time. The module's backend
`systemId` remains available on the `ConfigurationItem` for display and API
work, while the composite key is used for local project state.

The following state is keyed by `moduleInstanceKey`:

- configured CKV entries;
- module-wide PID support;
- loading and mutation status, if introduced by the store implementation.

This preserves isolation between module instances while retaining the current
store's nested module/instance representation at the persistence boundary.

### 3.2 CKV identity

`ConfiguredCkv` will carry two identities where available:

- `backendSystemId`: the backend CKV ID, preserved from `CkvDto.systemId`;
- `clientId`: a stable UI identity. Existing entries use the backend ID; new
  entries receive a client-generated UUID.

The client identity is not sent as a new backend field. Request mapping
projects only the fields already understood by the backend.

The summary and Edit/Delete callbacks use `clientId`, not an array index. This
prevents an edit or delete from targeting the wrong entry after another entry
is removed.

### 3.3 Module-wide PID state

PID support is stored separately from the CKV key/value identity:

```text
moduleParametersByInstance[moduleInstanceKey] = CkvParameter[]
```

The checked PID IDs in this state apply to every CKV for that module instance.
When the user applies a CKV Add or Edit, the atomic mutation writes the same
PID set to every saved CKV and to the module-level PID state.

PID support is therefore deliberately excluded from duplicate comparison. Two
CKVs differ only by their key/value pairs; PID support is a property of the
module's CKV configuration.

### 3.4 Canonical duplicate identity

The pure helper in `features/key-configurator/lib/ckv-identity.ts` will:

1. map each pair to `keyId:valueId`;
2. sort the pair signatures numerically or lexically by ID;
3. join them into one canonical string;
4. compare canonical strings without considering selection order.

The helper does not include PID IDs, labels, array position, or backend/client
identity. This means reordered pairs and different display labels do not create
false non-duplicates.

## 4. Store operations

`calibration-keys-store.ts` will expose an atomic operation for Add/Edit. Its
inputs identify the module instance, optional target `clientId`, pending PID
parameters, and pending key/value pairs. Its result distinguishes success from
validation and duplicate failure.

### 4.1 Add

The store validates the pending key/value set against every existing CKV for
the same module instance. If an exact match exists, it returns a duplicate
error and does not change any state.

Otherwise it appends one new CKV entry and applies the pending PID set to all
CKVs for that module instance.

### 4.2 Edit

The store locates the target by `clientId` and excludes that entry from the
duplicate comparison. It then validates the pending key/value set against all
other entries.

- An unchanged Edit succeeds and preserves the target identity.
- An Edit that matches another entry returns a duplicate error with no state
  mutation.
- A valid changed Edit replaces only the target's key/value pairs.
- The pending PID set is applied to all entries in the module instance.

The mutation builds the complete next module-instance value before calling
Zustand `set`. There is no remove-then-add sequence visible to subscribers,
which prevents partially applied edits.

### 4.3 Delete

Delete uses `clientId` to remove exactly one saved entry. The `Zero` display
state is derived when the saved list is empty and is never passed to the store
as a deletable CKV identity.

### 4.4 Validation result

The store/UI validation contract is:

- at least one PID must be checked;
- at least one key/value pair must be selected;
- duplicate key/value identity is rejected within the same module instance.

Validation errors remain in the active panel draft. Successful mutation is the
only path that closes Add/Edit mode and clears draft state.

## 5. CKV panel behavior

### 5.1 Existing panel changes

`CalibrationKeysConfigPanel` remains the owner of transient editor state:

- Add/Edit mode;
- active CKV `clientId`;
- pending key/value selections;
- pending module-wide PID selections;
- search, sort, and expansion state;
- inline validation/mutation error.

The panel reads saved entries and the module-instance PID state from the store.
It does not write saved state while the user is selecting keys or values.

The current index-based Edit/Delete callbacks are replaced with `clientId`
callbacks. The existing pre-population behavior is retained: selected values
are checked, their keys are expanded, and selected keys are partitioned before
unselected keys.

### 5.2 PID section

The existing `CkvParametersSection` remains visually and behaviorally the PID
editor. Its changes are draft-only until Apply. The section label and helper
text make the module-wide scope explicit: the checked PIDs apply to all CKVs
for the module.

When the panel opens an Edit session, it initializes the PID controls from the
module-instance PID state, not from an individual CKV's key/value pairs.

### 5.3 Key/value picker

The existing search, sorting, expansion, Select All, and selected-first
behavior remain in the picker. Key/value changes affect only the active CKV
draft.

Unchecking a key immediately removes its pending values. Reselecting that key
does not restore the old values; it starts unselected and requires an explicit
value selection.

### 5.4 Apply and Cancel

Apply calls the atomic store operation and handles its typed result:

- success: close the session, clear draft state, and scroll to the saved CKV
  summary;
- duplicate: keep the session open and show the duplicate error near Apply;
- validation: keep the session open and show the affected validation error;
- unexpected persistence/store failure: keep the last saved state and show a
  recoverable error.

Cancel clears only transient panel state. It does not call a store mutation.
The existing confirmation pattern is used when the draft contains changes.

Delete uses the project's QUI confirmation component before calling the store.
The user remains on the current saved state if deletion is cancelled or fails.

## 6. Multiple-module selection and vertical layout

### 6.1 Stable configuration item key

`widgets/configurator-panel` will add a local helper that derives a stable key
from the discriminated item type:

- module: `module:<systemId>:<instanceId>`;
- subgraph: `subgraph:<systemId>`;
- subsystem: `subsystem:<systemId>`.

`ConfigurationSection`, React `key` values, expansion state, and removal
callbacks use this identity. Numeric `id` remains available for existing
display and lookup behavior but is not used as the unique identity for module
sections.

### 6.2 Ctrl+Click flow

The existing selection utility continues to treat Ctrl+Click as a toggle:

- clicking without Ctrl replaces the selected-items array;
- Ctrl+Click adds an unselected module;
- Ctrl+Click on an already selected module removes only that module.

The selection store preserves insertion order. `ConfiguratorPanel` maps that
order directly to vertically stacked sections, so the first selected module is
rendered first.

### 6.3 Panel isolation

Each module section renders a `ModuleConfigurationPanel` with its own
`moduleId` and `instanceId`. React keys use the stable module-instance key, so
adding or removing another module does not reuse a draft component for the
wrong module.

When a module is deselected, its section unmounts. Its uncommitted local draft
is discarded; saved store state remains unchanged.

Section expansion state is reconciled by stable key rather than resetting all
sections whenever the selected-items array changes.

## 7. File-level changes

Expected implementation files:

| Area | File | Change |
| --- | --- | --- |
| CKV identity | `packages/react-app/src/features/key-configurator/lib/ckv-identity.ts` | Add pure canonical signature, duplicate comparison, and module-instance key helpers. |
| CKV types | `.../module-configurator-view/ui/calibration-keys/calibration-keys-config.types.ts` | Add client/backend identity fields and typed mutation results. |
| CKV store | `.../model/calibration-keys-store.ts` | Add module-instance PID state and atomic Add/Edit/Delete operations. |
| CKV mapper | `.../module-configurator-view/ui/calibration-keys/ckv.mapper.ts` | Preserve backend CKV identity and map module-wide PID state. |
| CKV panel | `.../module-configurator-view/ui/calibration-keys/calibration-keys-config-panel.tsx` | Use stable CKV IDs, typed results, module-wide PID drafts, and inline errors. |
| PID section | `.../module-configurator-view/ui/calibration-keys/ckv-parameters-section.tsx` | Clarify module-wide PID scope if needed by the final QUI copy. |
| Summary | `packages/react-app/src/features/key-configurator/config-summary-view.tsx` | Support stable string or numeric item IDs and route Edit/Delete by identity. |
| Vertical sections | `packages/react-app/src/widgets/configurator-panel/ui/configurator-panel.tsx` | Use composite item identity and preserve section state while selection changes. |
| Widget integration | `packages/react-app/src/widgets/key-configurator-panel/ui/key-configurator-panel.tsx` | Pass module-instance identity through the configuration renderer and callbacks. |
| Public exports | Relevant `index.ts` files | Export only helpers/types needed by consumers and tests. |
| Unit tests | `packages/react-app/tests/features/key-configurator/...` | Cover CKV helpers, store mutations, panel flows, and multi-instance behavior. |
| Widget tests | `packages/react-app/tests/widgets/configurator-panel/...` | Cover stable identity, Ctrl+Click selection, vertical order, and deselection. |

The exact file split may be adjusted during implementation if an existing
public API can be extended without introducing a second abstraction.

## 8. Error handling and logging

User-correctable errors are rendered inline and do not use browser `alert`.
The logger records failed store actions with the module-instance key and
operation name, but tests mock `~shared/lib/logger` as required by the project
test conventions.

The store never mutates state before duplicate and validation checks complete.
If a store/backend operation fails, the previous saved CKV list and PID state
remain intact. Draft state remains available for retry.

## 9. Testing strategy

### 9.1 Pure helper tests

- Pair order does not affect a canonical signature.
- Different key/value sets are not duplicates.
- PID differences do not affect duplicate identity.
- Module definition ID plus instance ID produces distinct module keys.

### 9.2 Store tests

- Add appends one CKV and broadcasts PIDs to all existing CKVs.
- Add rejects an exact duplicate without changing array references or length.
- Edit excludes its target from duplicate comparison.
- Unchanged Edit succeeds with the same client/backend identity.
- Edit rejects a match with another CKV without partial removal.
- Valid Edit changes only the target key/value pairs and broadcasts PIDs.
- Delete removes only the requested identity.
- Validation failure leaves saved CKVs and PID state unchanged.

### 9.3 Panel tests

- Existing CKV values and keys are restored in Edit.
- PID controls initialize from module-wide state.
- Key/value edits remain draft-only until Apply.
- Duplicate errors remain visible and preserve selections.
- Apply success closes the editor and refreshes the summary.
- Cancel discards pending key/value and PID changes.
- Unchecking and reselecting a key starts with no old values selected.

### 9.4 Vertical selection tests

- Ctrl+Click adds a second module without removing the first.
- Sections render in selection order.
- Two instances sharing a module definition ID receive distinct React and
  state identities.
- Removing one selected module leaves the other section and draft intact.
- Removing a module discards only that module's uncommitted draft.

## 10. Requirements alignment

| Requirements | Design coverage |
| --- | --- |
| FR-CKV-01–08 | Module-instance state, summary operations, Zero protection, and Delete flow in Sections 3–5. |
| FR-CKV-09–16 | Edit identity, pre-population, PID draft, and key/value picker behavior in Sections 3 and 5. |
| FR-CKV-17–24 | PID/key/value sections and picker behavior in Section 5. |
| FR-CKV-25–33 | Atomic Add/Edit, validation, duplicate handling, Cancel, and error results in Sections 4 and 5. |
| FR-CKV-34–39 | Stable item identity, Ctrl+Click, vertical ordering, isolation, and deselection in Section 6. |
| I1–I8 | Composite ownership, atomic mutations, Zero handling, identity-preserving Edit, duplicate comparison, and panel isolation in Sections 3–6. |
| NFR-CKV-01–04 | Existing responsive controls, keyboard-named actions, inline errors, and draft ownership in Sections 5 and 8. |

The only deliberate clarification from requirements approval is that PID
support is module-wide and excluded from per-CKV duplicate identity, matching
the shared reference screen and current product behavior.

## 11. Self-review notes

- No backend endpoint or DTO contract is added.
- No lower FSD layer imports a widget or page layer.
- Duplicate comparison is pure and independently testable.
- Add/Edit mutations are atomic and do not use array indexes as identity.
- Multiple module instances with the same module definition ID are isolated.
- Browser alerts are replaced by inline UI errors and existing confirmation
  patterns.
- `Zero` remains a derived default state rather than a mutable CKV entry.
