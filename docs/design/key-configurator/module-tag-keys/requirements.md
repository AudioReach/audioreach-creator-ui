# Module Tag Keys (TKV) — Requirements

## Feature Overview and Strategic Fit

Key Configurator is the panel used to configure key-based settings for a
project: subgraph key vectors, subsystem keys, calibration key vectors
(CKV), and tag key vectors (TKV) for module instances. It exists to
simplify setting up and maintaining audio use-case configuration without
hand-editing raw project data.

**This work's scope is TKV (module tag keys) only.** The CKV, subgraph
key vector (SGKV), and subsystem key panels are unaffected by this work
— see [Not Doing](#not-doing).

TKV state — which tag key vectors are configured for a module instance,
the tags available to configure, and the per-module parameter (PID)
list — is owned by the graph designer's per-project configuration state
(a dedicated TKV slice composed into `GraphDesignerStore`), scoped per open
project tab. This is the single supported home for TKV state and behavior
going forward:

1. **Edit functionality** — the TKV panel's existing add/edit/delete/
   apply behavior becomes the supported, non-regressed baseline.
2. **Per-project scoping** — TKV state is scoped to the project tab it
   belongs to, so multiple open projects never share or overwrite each
   other's TKV state.

## Architectural Impacts

- **Graph Visualization Support** — the Key Configurator panel already
  has access to the per-project configuration state it needs; no
  provider-tree changes are required to support this feature.
- **Scalability** — TKV state is per-project-tab, so opening multiple
  projects simultaneously keeps each project's TKV configuration fully
  independent — no cross-tab overwrite risk.
- **Instance-Level Scoping** — configured tag key vectors are stored per
  module instance, keyed by each instance's own unique identifier, so
  multiple placed instances of the same module type never share or
  overwrite each other's configuration.
- **Fetch ownership** — selecting a module instance triggers a fetch of
  that module's definition and tuning configuration. The tag-vector
  portion of that data must be fetched and owned entirely within the
  per-project configuration state (no dependency on logic outside it —
  see Decision D1). Because the calibration-key (CKV) side of the panel
  fetches the same module definition and tuning configuration
  independently (out of scope for this work), the two fetch paths must
  share the underlying data-fetching calls so a single module selection
  does not trigger duplicate network requests (see Decision D2).

## Assumptions

- **Reset on Use Case Refresh** — the Key Configurator view resets to an
  empty state when the use case is refreshed.
- **Configuration Mode Control** — in Offline mode, key configuration is
  only permitted when graph modification (edit mode) is enabled; in RTC
  mode the panel is always read-only.
- **D1 — Self-contained fetch.** Fetching and populating TKV data for a
  selected module instance is handled entirely within the per-project
  configuration state itself, with no dependency on fetch/distribution
  logic that lives outside it.
- **D2 — Shared fetch.** The module definition and tuning-configuration
  fetch is shared between the CKV and TKV paths so that a module
  selection triggers one network fetch, not two.
- **D3 — Slice `get()` access.** The TKV slice's creator function gains
  access to the store's `get()` (today it only receives `set()`), needed to
  check whether an instance's data is already loaded before re-fetching —
  mirroring how other `GraphDesignerStore` slices are already wired.
- **D4 — Independent context type.** The TKV slice defines its own
  configuration-context type rather than importing the configuration-context
  type already defined inside the `key-configurator` feature — the two
  features cannot import each other, so each owns the shape it needs. The
  widget that has access to both is responsible for translating a selected
  configuration item into the shape the TKV slice expects.
- Tag-group and per-module-type parameter definitions are fetched at most
  once per project tab and reused across module selections within that tab,
  consistent with the "reset on use case refresh" assumption above.

## Requirements

| #   | Title                                                              | User Story                                                                                                                                                                                           | Importance | Type        | Notes                                                                                                                      |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Show Tag Key Vector UI on Module Selection                         | As a user, when I select a module instance, I want the Tag Key Vector configuration UI to appear so I can view or edit tag-based configurations.                                                     | High       | Functional  | UI hidden when no module selected; visible when one module is selected.                                                    |
| 2   | Display Configured TKVs                                            | As a user, if any tag key vectors are configured, I want to see them in the Configured TKVs section (expanded) with edit and delete icons for each configuration and an Add button in the header.    | High       | Functional  | Configured TKVs grouped by tag; edit/delete icons visible; Add icon in header.                                             |
| 3   | Group Configurations by Tag                                        | As a user, I want all key vectors grouped under their corresponding tag so I can manage them easily.                                                                                                 | High       | Functional  | Each tag acts as a group header; delete button at tag level removes all configurations under that tag.                     |
| 4   | Delete Tag-Level Configurations                                    | As a user, when I click the delete button at the tag level, I want all configurations under that tag removed.                                                                                        | High       | Functional  | Confirmation prompt; deletes all configurations for that tag.                                                              |
| 5   | No Configuration Exists                                            | As a user, if nothing is configured, I want to see an empty configuration message along with an Add button so I know I can create a new configuration.                                               | High       | Functional  | Add icon visible.                                                                                                          |
| 6   | Hide Available Tags and Search by Default                          | As a user, I don't want to see available tags or search bar until I choose to add or edit, to keep the UI clean.                                                                                     | Medium     | Functional  | Tags panel and search hidden initially.                                                                                    |
| 7   | Add Flow: Show Available Tags + Search + Expand All + Collapse All | As a user, when I click Add, I want to see available tags with a search bar and PIDs configuration section so I can configure tag-based key-value pairs.                                             | High       | Functional  | Clicking Add reveals tags list, search bar, PID section, Apply/Cancel buttons.                                             |
| 8   | Edit Flow: Pre-populated Selection                                 | As a user, when I click Edit, I want to see available tags with current key-value selections and configured PIDs so I can modify them easily.                                                        | High       | Functional  | Edit shows tags with pre-selected values and PID selections.                                                               |
| 9   | Delete TKV Configuration                                           | As a user, when I click Delete on a specific configuration, I want that configuration removed so I can manage others.                                                                                | High       | Functional  | Confirmation prompt; deletes only selected configuration.                                                                  |
| 10  | Single Tag Configuration                                           | As a user, I want to configure only one tag at a time so I can avoid conflicts.                                                                                                                      | High       | Functional  | UI enforces single-tag configuration per operation.                                                                        |
| 11  | Apply: Save to Configured TKVs Section                             | As a user, when I click Apply, I want the configuration added/updated and visible in the Configured TKVs section.                                                                                    | High       | Functional  | Valid input required; updates TKVs.                                                                                        |
| 12  | Select All Values Under a Tag                                      | As a user, when I click the Select All checkbox for a key under a tag, I want all values for that key selected so I can configure them quickly.                                                      | Medium     | Functional  | Select All applies to values under that key only; reflects checked state.                                                  |
| 13  | Expand All Keys                                                    | As a user, when I click Expand All, I want all keys and values expanded so I can view details at once.                                                                                               | Medium     | Functional  | Clicking Expand All expands all collapsible sections; button toggles state if needed.                                      |
| 14  | Collapse All Keys                                                  | As a user, when I click Collapse All, I want all keys and values collapsed so I can minimize clutter.                                                                                                | Medium     | Functional  | Clicking Collapse All collapses all sections; button toggles state if needed.                                              |
| 15  | Per-Project TKV State Scoping                                      | As a user with multiple projects open, I want each project's tag key vector configuration kept completely separate so working in one project never affects another.                                  | High       | Functional  | TKV state is scoped per open project tab.                                                                                  |
| 16  | Instance-Level TKV Scoping                                         | As a user, when a module type has multiple instances placed in the graph, I want each instance's configured tag key vectors kept independent, so configuring one instance never affects another.     | High       | Functional  | Configured TKVs are keyed by each instance's own unique identifier, never shared across instances of the same module type. |
| 17  | Available Tags Remain Grouped                                      | As a user, I want available tags shown grouped by tag (not as a flat list) when adding or editing, so the picker stays organized.                                                                    | High       | Functional  | Grouping is preserved as part of this feature's data.                                                                      |
| 18  | Module Parameter (PID) List Available                              | As a user, I want the PID selection section to show the correct parameters for the module I'm configuring.                                                                                           | High       | Functional  | Per-module parameter list is preserved as part of this feature's data.                                                     |
| 19  | Self-Contained Data Fetch                                          | As a user, when I select a module instance, I want its tag key vector data to load without relying on logic outside the Key Configurator's own state, so behavior is predictable and self-contained. | High       | Functional  | See Decision D1.                                                                                                           |
| 20  | No Duplicate Network Fetch on Module Selection                     | As a user, when I select a module instance, I want its configuration data fetched once, not twice, so selection stays fast and doesn't waste bandwidth.                                              | Medium     | Performance | See Decision D2.                                                                                                           |
| 21  | Persist Configured TKVs on Save                                    | As a user, when I save my configuration, I want newly added/edited/deleted TKVs persisted to the backend so my changes aren't lost.                                                                  | High       | Functional  | Exact endpoint contract (bulk vs. per-module) is unresolved — see [Open Questions](#open-questions).                       |
| 22  | Sort Available Tags by ID or Name                                  | As a user, I want to sort available tag keys and values by ID or Name, in ascending or descending order, so I can find entries more easily.                                                          | Medium     | Functional  | Toggling a column re-sorts ascending/descending; existing behavior, carried over unchanged by this migration.             |

## Open Questions

1. **Backend save contract for TKV.** Saving needs to persist configured
   TKVs to the backend, but no endpoint currently exists for TKV
   list-management (only parameter-_value_ endpoints exist, covering a
   different operation). Should saving call a single bulk endpoint
   covering all modified modules/instances in one request, or a
   per-module (or per-instance) endpoint once per changed module? This
   determines both the save action's shape and the backend API
   contract, and needs clarification before design can finalize the
   save flow.

## Not Doing

- CKV (calibration key vectors), SGKV (subgraph key vectors), and
  subsystem key panels are not modified by this work.
- Building the actual backend endpoint(s) for TKV list-management
  persistence is not decided/built here if the Open Question above isn't
  resolved in time; design will propose an interim approach if needed.
