<!--
Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
SPDX-License-Identifier: BSD-3-Clause
-->

# Calibration Key Vector Edit: Requirements

**Date:** 2026-09-15
**Status:** Frozen

## 1. Context

### 1.1 Problem statement

The Key Configurator must allow a user to configure calibration key vectors
(CKVs) for a selected module instance. Users need to create a CKV from
available calibration keys and values, associate it with supported PIDs, and
revise an existing CKV without rebuilding it from scratch.

The existing CKV configuration UI contains an Added CKVs list, PID support settings, calibration-key
selection, and values for the selected calibration key. This document captures
the current CKV requirements and makes the edit workflow explicit.

### 1.2 What this builds on

- Module selection in the Key Configurator view.
- The existing CKV Config and Module Tag tabs.
- The existing Added CKVs, Configure PIDs for CKVs, Select Calibration Keys,
  and Select Calibration Key Values sections.
- Existing Add, Delete, Edit, Apply, and Cancel interaction patterns.

### 1.3 Key decisions already made

- CKV configuration is scoped to a selected module instance.
- PID support is configured at module scope and applies to all CKVs for that
  module.
- Each CKV contains selected calibration key/value pairs.
- The default empty configuration is represented by `Zero`.
- Add and Edit use the same picker controls; Edit starts with the saved CKV
  selections restored.

## 2. Definitions

| Term              | Definition                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| CKV               | Calibration Key Vector: a configuration containing supported PIDs and selected calibration key/value pairs. |
| Added CKV         | A saved, non-default CKV shown in the Added CKVs list.                                                      |
| Zero CKV          | The default state used when no calibration key/value configuration is saved.                                |
| PID               | Parameter identifier to which the CKV applies.                                                              |
| Calibration key   | A selectable calibration parameter, identified by a key name and ID.                                        |
| Calibration value | A selectable value belonging to a calibration key.                                                          |
| CKV session       | The temporary Add or Edit state between opening the editor and Apply or Cancel.                             |

## 3. Functional Requirements

### 3.1 Module scope and initial state

#### FR-CKV-01: Show CKV configuration for a selected module

When a user selects a module instance, the Key Configurator shall display the
CKV configuration UI for that module.

#### FR-CKV-02: Isolate CKV state by module

The CKV list, PID settings, calibration-key selections, and calibration values
shown for one module shall not be applied to another module unless the user
explicitly configures that module.

#### FR-CKV-03: Show Zero CKV when no CKV is configured

When the selected module has no saved CKV, the Added CKVs list shall show
`Zero` and the PID section shall show all available PIDs as supporting CKV by
default.

#### FR-CKV-04: Show saved CKVs

When the selected module has one or more saved CKVs, the Added CKVs list shall
show each saved CKV as a separate selectable entry.

### 3.2 Added CKV list operations

#### FR-CKV-05: Select an Added CKV

The user shall be able to select an entry in the Added CKVs list. Selection
shall determine which CKV is displayed and edited in the remaining sections.

#### FR-CKV-06: Add a CKV

When the user activates Add, the UI shall open an empty CKV session containing
the available PID, calibration-key, and calibration-value controls.

#### FR-CKV-07: Delete a saved CKV

When the user selects a saved CKV and activates Delete, the UI shall remove
that CKV after any required confirmation. The default `Zero` entry shall not be
deleted as a saved CKV.

#### FR-CKV-08: Protect Zero CKV from normal editing

The `Zero` entry shall represent the empty/default state. Edit and Delete shall
not modify or remove `Zero`; the user shall use Add to create a non-default
configuration.

### 3.3 CKV Edit flow

#### FR-CKV-09: Open an existing CKV for editing

When the user selects a saved CKV and activates Edit, the UI shall open a CKV
session populated with that CKV's current configuration.

#### FR-CKV-10: Restore module-wide PID support in Edit

During Edit, the Configure PIDs for CKVs section shall show the saved support
state for every available PID. A checked Support CKV control shall mean that
the PID currently applies to all CKVs for the module.

#### FR-CKV-11: Restore calibration-key selections in Edit

During Edit, the Select Calibration Keys section shall show the saved
calibration keys selected and the remaining available keys unselected.

#### FR-CKV-12: Restore calibration values in Edit

During Edit, the Select Calibration Key Values section shall show the saved
values for the selected calibration key. Values shall remain associated with
their calibration key and shall not be replaced by values from another key.

#### FR-CKV-13: Modify module-wide PID support in Edit

During Add or Edit, the user shall be able to check or uncheck PID support
controls. The pending PID changes shall apply to all CKVs for the module and
shall remain temporary until Apply is activated.

#### FR-CKV-14: Modify calibration keys in Edit

During Edit, the user shall be able to select or clear calibration keys. When a
key is selected, its values shall be available for value selection. Clearing a
key shall clear its values from the pending CKV session.

#### FR-CKV-15: Modify calibration values in Edit

During Edit, the user shall be able to change the selected values for each
selected calibration key. The pending CKV shall retain at most the values
currently selected for each key.

#### FR-CKV-16: Edit selection is pre-populated at the top of the list

When the available calibration-key or value list is scrollable, the keys and
values restored from the existing CKV shall be visible without requiring the
user to search through the unselected entries.

### 3.4 PID and calibration-key interaction

#### FR-CKV-17: Configure PID support

The Configure PIDs for CKVs section shall display each available PID, its name,
and a Support CKV checkbox.

#### FR-CKV-18: Display calibration-key identity

The Select Calibration Keys section shall display each available calibration
key with its name and ID.

#### FR-CKV-19: Display values for the active calibration key

The Select Calibration Key Values section shall display values belonging to the
currently active calibration key, together with a search control when the list
is searchable.

#### FR-CKV-20: Keep key and value selections consistent

The UI shall not allow a value to remain selected for a calibration key that is
not selected in the CKV session.

### 3.5 Search, selection, and list controls

#### FR-CKV-21: Search calibration keys and values

When the user enters search text, the UI shall filter the relevant calibration
key or value list by the supported name and ID fields without changing hidden
selection state.

#### FR-CKV-22: Select all visible items

When the user activates Select All, the UI shall select only the items visible
under the current filter. Clearing Select All shall clear only the visible
items.

#### FR-CKV-23: Expand all calibration keys

When the user activates Expand All, the UI shall expand all calibration-key
groups and show their available values.

#### FR-CKV-24: Collapse all calibration keys

When the user activates Collapse All, the UI shall collapse all calibration-key
groups while preserving their selection state.

### 3.6 Apply, Cancel, and validation

#### FR-CKV-25: Apply a new CKV

When the user activates Apply in an Add session and the CKV is valid, the UI
shall save the new CKV and show it in the Added CKVs list.

#### FR-CKV-26: Apply CKV edits

When the user activates Apply in an Edit session and the CKV is valid, the UI
shall replace the selected saved CKV with the edited calibration key/value
selections and apply the pending module-wide PID support to all CKVs for that
module.

#### FR-CKV-27: Preserve the original CKV until Apply

Changes made during Add or Edit shall not update the saved CKV or the active
configuration until Apply succeeds.

#### FR-CKV-28: Cancel Add or Edit

When the user activates Cancel during Add or Edit, the UI shall discard all
pending PID, calibration-key, and calibration-value changes and restore the
previous saved state.

#### FR-CKV-29: Validate CKV before Apply

Apply shall reject an invalid CKV and show an actionable validation message.
At minimum, a CKV shall identify its supported PID state and contain the
required calibration key/value selections for the configuration format.

#### FR-CKV-30: Preserve pending values after validation failure

When Apply fails validation or persistence, the UI shall keep the CKV session
open and preserve the user's pending selections so they can correct and retry.

#### FR-CKV-31: Report persistence errors

When saving or deleting a CKV fails, the UI shall show an error, shall not
silently report success, and shall preserve the last known saved configuration.

#### FR-CKV-32: Prevent duplicate CKVs

When the user activates Apply in an Add or Edit session, the UI shall reject
the pending CKV if the same module already contains a CKV with the same
supported PID set and the same calibration key/value selections. The comparison
shall be order-independent and the UI shall show an actionable duplicate error.

#### FR-CKV-33: Allow an unchanged Edit

When the user applies an Edit without changing the selected CKV, the UI shall
allow the update because the CKV being edited is excluded from its own duplicate
comparison. The Edit shall update the existing entry rather than create a new
entry.

### 3.7 Multiple-module selection

#### FR-CKV-34: Select multiple modules with Ctrl+Click

When the user selects modules with Ctrl+Click, the Key Configurator shall keep
each selected module in the active selection instead of replacing the previous
selection. This requirement refers to the Ctrl+Click multi-selection gesture.

#### FR-CKV-35: Show one CKV panel per selected module

When multiple modules are selected with Ctrl+Click, the UI shall display one
complete CKV configuration/edit panel for each selected module, arranged
vertically in the selection order.

#### FR-CKV-36: Identify each module panel

Each vertically stacked CKV panel shall identify the module it configures so
the user can distinguish its Added CKVs, PID settings, calibration keys, and
values from the other panels.

#### FR-CKV-37: Keep multi-module CKV edits independent

Adding, editing, deleting, applying, cancelling, searching, expanding, or
collapsing content in one selected module's CKV panel shall not modify the
pending or saved state of any other selected module's panel.

#### FR-CKV-38: Apply multi-module changes to the correct module

When the user applies a valid CKV change from a vertically stacked panel, the
change shall be saved only for the module identified by that panel.

#### FR-CKV-39: Remove a module panel when deselected

When the user Ctrl+Clicks a selected module to remove it from the active
selection, its CKV panel shall be removed and any uncommitted changes in that
panel shall be discarded without affecting the remaining panels.

## 4. Invariants

**I1 — Module isolation:** A CKV belongs to exactly one module configuration
scope unless an explicit product rule says otherwise.

**I2 — No orphan values:** Every selected calibration value belongs to a
selected calibration key.

**I3 — Atomic Apply:** A CKV update is committed as one operation. A failed
update shall not leave a partially updated combination of PID, key, or value
selections.

**I4 — Cancel is non-mutating:** Cancel shall not modify the saved CKV or the
active configuration.

**I5 — Zero is a default state:** `Zero` is not treated as an editable or
deletable saved CKV.

**I6 — Edit preserves identity:** Editing a saved CKV updates that CKV rather
than creating an unintended duplicate entry.

**I7 — No duplicate CKVs:** A module shall not contain two CKVs with the same
calibration key/value selections, regardless of the order in which those items
were selected. PID support is module-wide and is not part of the per-CKV
duplicate identity.

**I8 — Independent module panels:** A CKV edit panel represents one selected
module. Pending changes in one panel shall not change another selected
module's panel.

## 5. Non-Functional Requirements

**NFR-CKV-01 — Responsiveness:** Search, selection, expansion, and collapse
interactions shall provide visible feedback without avoidable delay for the
expected module, PID, key, and value list sizes.

**NFR-CKV-02 — Accessibility:** All Add, Delete, Edit, Apply, Cancel,
selection, search, and expansion controls shall be keyboard reachable and have
an accessible name or label.

**NFR-CKV-03 — Error clarity:** Validation and persistence errors shall be
shown near the affected section or action and shall explain how the user can
recover.

**NFR-CKV-04 — State safety:** Pending edits shall not be lost because of a
render, search, expand/collapse, or selection change within the CKV session.

## 6. Out of Scope

- Editing Module Tag configurations.
- Editing graph or subgraph key vectors.
- Changing the backend CKV data model or persistence API contract.
- Bulk editing CKVs across multiple module instances.
- Reordering saved CKVs in the Added CKVs list.
- Creating or editing calibration-key definitions, PID definitions, or their
  available values.

## 7. Open Questions

**OQ-1:** What exact validation rule determines whether a CKV must contain at
least one supported PID, at least one calibration key/value pair, or both?

**OQ-2:** Is confirmation required before deleting a saved CKV, and if so,
what confirmation component and message should be used?

**OQ-3:** Should selecting multiple Added CKVs be supported as a display-only
selection, or must the list enforce exactly one selected CKV for Edit?

**OQ-4:** When a selected calibration key is unchecked during Edit, should its
pending values be permanently discarded immediately or restored if the key is
reselected before Apply?
