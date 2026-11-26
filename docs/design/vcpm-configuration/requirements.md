# VCPM Configuration — Requirements

## Feature Overview and Strategic Fit

Subgraphs whose `ScenarioId` property is set to `VoiceCall` support VCPM
(Voice Call Parameter Management) tuning — a set of parameters, each with
its own supported calibration key values (CKVs), configurable per subgraph.

This feature adds:

1. A trigger button on the subgraph Properties Panel, shown only when the
   subgraph's Scenario ID is `VoiceCall`.
2. A new tab (mirroring the existing module Calibration/Tag data tab) for
   viewing and editing VCPM parameter data, scoped to one subgraph.
3. An embedded "VCPM Key Configurator" panel for managing each parameter's
   associated CKVs (add/delete), reusing existing calibration-key-configurator
   UI building blocks.

Strategic fit: extends the existing module CKV/Key-Configurator pattern
(already shipped for module tuning) to subgraph-level VCPM tuning, without
touching the existing module tab or the existing Subgraph Key Configurator
(SGKV) feature, which is unrelated (KV vectors for usecase routing, not CKV
parameter calibration).

## Architectural Impacts

- **New FSD slices**, keyed by `subgraphSystemId` (not module-instance
  `systemId`) — a different keying domain from the existing
  `ModuleDataSlice`/`CalibrationKeyConfigSlice`, so **not** folded into
  them and **not** added to `GraphDataSlice.Subgraph` (would pollute the
  canonical graph-topology model with transient UI-session state):
  - `features/graph-designer/model/vcpm-data-slice.ts` (`VcpmDataSlice`)
  - `features/graph-designer/model/vcpm-key-config-slice.ts` (`VcpmKeyConfigSlice`)
  - Both spread into `GraphDesignerStore`
    (`features/graph-designer/model/graph-designer-store.ts`), confirmed by
    reading the current file — it already composes 21 slices via flat
    `set`/`get`-bound spreads; two more follow the identical pattern.
- **New entity** `entities/vcpm/` (DTOs + API functions), mirroring
  `entities/spf-module-data/` conventions.
- **New widget** `widgets/vcpm-data-tab/`, structurally modeled on
  `widgets/module-data-tab/`'s `cal-data-panel.tsx` pattern — reuses
  `features/generic-tree-view`'s `GenericTreeView` directly instead of
  building a bespoke list/detail UI, giving multi-select checkboxes,
  vertical-stacked parameter detail, the Legacy/Modern toggle, and the
  Basic/Advanced + PIDs/Ranges/Badges controls identically to the module
  tab, with no exclusions.
- **New feature view** `features/key-configurator/vcpm-configurator-view/`
  — a sibling to the existing `module-configurator-view/`, not a
  modification of it.
- **No export changes needed** on `features/generic-tree-view/` —
  confirmed by reading `features/generic-tree-view/index.ts`: it already
  publicly exports `GenericTreeView` itself (not just its editing
  primitives), along with `GenericTreeViewHandle`, `GenericTreeViewProps`,
  `TreeViewData`, `TreeViewItem`, and `buildDirtyItems`. `widgets/vcpm-data-tab`
  can import and reuse the whole component as-is.
- **Promotion to `shared/`**: `widgets/module-data-tab/use-index-switch-dialog.ts`,
  `ui/unsaved-changes-dialog.tsx`, and `ui/index-select.tsx` (`IndexSelect`)
  are not exported today (confirmed via `widgets/module-data-tab/index.ts`,
  which exports only `ModuleDataTab` and its handle type) but are already
  fully generic — `IndexSelect`'s props (`collection`, `label`,
  `onValueChange`, `value`) have no module-specific coupling. Promoting all
  three lets `widgets/vcpm-data-tab` reuse them directly — including the
  shared Calibration data index dropdown itself (requirement 9) — without
  reaching into another widget's private internals or building a parallel
  `VcpmIndexSelect`.
- **Trigger wiring:** `PropertiesPanelHost` and `GraphDesigner` are **not**
  parent/child. Both are independent FlexLayout panel factories registered
  in `widgets/start-page/use-project-opener.tsx`, each wrapped in its own
  `GraphDesignerStoreContext.Provider value={tabStore}` — they share only
  the Zustand store instance, not a React tree. Confirmed by reading
  `graph-designer.tsx` (the `handleModuleDoubleClick` precedent uses local
  `useRef` guards — `pendingModuleOpensRef`, `moduleDataTabRefs` — that are
  component-local, not store state) and `properties-panel-host.tsx` (no
  such refs, no `tabLayoutService` import today). The new VCPM tab-open
  handler must live in `properties-panel-host.tsx` with its **own** local
  guard refs mirroring the pattern, not sharing `graph-designer.tsx`'s.
  The force-close watcher for requirements 23–24 lives alongside it in the
  same component, since `PropertiesPanelHost` already re-renders on every
  `graphData` change — see design.md's "Tab force-close" section.
- `ApiIssueEntityType` (`shared/api/api-response.types.ts`) already includes
  `'VcpmModuleDefinition'`, confirming the standard `ApiIssue`/
  `hasBlockingIssues`/`getIssueMessage` error channel is already anticipated
  for this feature.
- **Shared infra gap found during review:** `processApiResponse`
  (`shared/api/utils.ts`) only guards JSON parsing on the `!response.ok`
  branch — a successful bodyless response (`204 No Content`, which Delete
  CKV returns) falls into the unconditional `await response.json()` on the
  success path, which throws on an empty body and is currently caught and
  reported as a synthetic `INVALID_JSON` issue with `severity: 'ERROR'`.
  That would make `hasBlockingIssues` report a successful delete as a
  failure. No existing caller depends on today's behavior (no code path in
  the repo currently returns a bodyless 2xx), so this is a narrow,
  additive fix: treat an empty 2xx body as `{data: undefined}`, not a
  parse failure. This fix in `shared/api/` is a prerequisite for
  requirement 19 (Delete CKV) to work correctly, not VCPM-specific code.

## Assumptions

- The `VoiceCall` Scenario ID value is `3` (`0x3`), matched by the
  property's value, not its display label. `SCENARIO_PROPERTY_ID =
0x08001010` (`use-subgraph-card-data.ts`) identifies the Scenario ID
  property itself — `3` is the value to match within that property.
- A newly-added CKV is broadcast to every VCPM parameter in the subgraph,
  not scoped to the currently-selected parameter — the POST body carries
  no parameter field because there is no per-parameter scoping to
  express. Every configured CKV therefore applies uniformly across all of
  a subgraph's parameters, so the VCPM tab needs exactly one
  subgraph-wide "Calibration data index" dropdown, not one per parameter
  — see requirement 9, which now reuses the module tab's existing shared
  `IndexSelect` directly instead of building a per-parameter variant.
- The `DELETE .../vcpm-ckv/{ckvSystemId}` endpoint returns no response
  body in either the success or failure case — success vs. failure is
  conveyed purely by HTTP status code. This differs from the module CKV
  delete precedent (`deleteCkvsApi` / `calibration-key-config-slice.ts`
  `deleteCkvs`), which returns the array of CKVs actually deleted (can
  cascade). There is no cascade to reconcile here: on success the
  frontend removes exactly the requested `ckvSystemId` from local state.
- The Set/cal-data endpoint's HTTP verb is `PUT`, matching the module
  cal-data save convention in
  `entities/spf-module-data/api/spf-module-api.ts`.
- `AddVcpmCkvsResponseDto` is assumed to mirror the module
  `AddCkvsResponseDto` shape (`addedCkvs` + `removedCkvSystemIds`).
- **Configuration Mode Control.** Mirrors the existing module/subgraph CKV
  and TKV precedent, where key configuration is only permitted while Graph
  Designer is in edit mode. The VCPM Key Configurator toggle button is
  enabled only when Graph Designer is in edit mode (`mode === 'edit'`,
  read via `useGraphDesignerStoreShallow` — the same source
  `PropertiesPanelHost` already uses for `isEditing`) and disabled in
  read-only mode. Unlike the always-rendered module/subgraph Key
  Configurators, which simply degrade to a read-only view in that case,
  the VCPM Key Configurator panel is opened on demand (requirement 11) —
  if it is already open and edit mode is subsequently exited, it
  auto-closes immediately rather than degrading to read-only
  (requirement 22).
- **Tab lifecycle vs. the subgraph it's scoped to.** Checked against the
  module tab precedent (`moduleOpenTabs`/`ModuleDataTab`): deleting a
  module today does **not** close its already-open tab — confirmed by
  reading `deleteModuleInstanceInner`, which calls
  `applyComponentCollection`, which only mutates `graphData`, never
  `moduleOpenTabs` — and module tabs were never tied to canvas selection in
  the first place. VCPM intentionally does **not** repeat the first half
  of that gap: the VCPM tab closes automatically if its subgraph is
  deleted (requirement 23) or if the subgraph's Scenario ID is edited away
  from `VoiceCall` (requirement 24) — both closes are silent, no
  unsaved-changes confirm dialog, since there is nothing left to save to
  either way. Deselecting the subgraph on canvas does **not** close the
  tab — the tab stays open independent of canvas selection, same as the
  module tab today.

## Requirements

| #   | Title                                             | User Story                                                                                                                                                                                                                                                                                           | Importance | Type       | Notes                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | VCPM Config trigger button                        | As a graph designer user, I want a "VCPM Config" button to appear next to Scenario ID only when it's set to `VoiceCall`, so I can access VCPM tuning only for subgraphs that support it.                                                                                                             | High       | Functional | Match by property value (`3`), not label. Renders in `subgraph-properties-card.tsx`.                                                                                                                                                                 |
| 2   | Fetch VCPM data on open                           | As a tuning engineer, I want clicking the button to fetch the subgraph's VCPM parameters and their CKVs, so the tab opens with real data.                                                                                                                                                            | High       | Functional | `GET /arc-api/v1/projects/{projectId}/subgraphs/{subgraphSystemId}/vcpm-ckv`                                                                                                                                                                         |
| 3   | Open titled tab                                   | As a tuning engineer, I want the VCPM tab titled `"<Subgraph Name> (<ID>)"`, so I can identify which subgraph I'm tuning.                                                                                                                                                                            | High       | Functional | `<ID>` hex via `formatDisplayId`. Mirrors module double-click-to-tab.                                                                                                                                                                                |
| 4   | Duplicate-tab guard                               | As a tuning engineer, I want re-clicking the button on an already-open subgraph to focus the existing tab, not open a duplicate.                                                                                                                                                                     | High       | Functional | Matches module tab's existing guard.                                                                                                                                                                                                                 |
| 5   | Reuse data-tab chrome                             | As a tuning engineer, I want the same tab rail / Search / Collapse-Expand / Modified indicator / Legacy-Modern toggle as the module tab, for a consistent experience.                                                                                                                                | High       | Functional | Legacy/Modern toggle is fully functional, same as the module tab (no longer a placeholder).                                                                                                                                                          |
| 6   | Two-panel default layout                          | As a tuning engineer, I want a resizable parameter-list panel and parameter-data panel by default, matching the module tab's split-panel behavior.                                                                                                                                                   | High       | Functional | Third panel (Key Configurator) added on demand.                                                                                                                                                                                                      |
| 7   | Get/Set enablement                                | As a tuning engineer, I want Get always enabled and Set disabled when there are no unsaved changes, data is invalid, or a save is in progress — same as the module tab.                                                                                                                              | High       | Functional | Reuse existing enablement rule.                                                                                                                                                                                                                      |
| 8   | Multi-parameter display                           | As a tuning engineer, I want to select multiple parameters via checkboxes and view their data stacked vertically, one after another — identical to the module tab — since a configured CKV applies uniformly across all parameters, not per parameter.                                               | High       | Functional | No longer a deviation from the module tab — reuses `GenericTreeView`'s native multi-select checkboxes and accordion-stacked detail directly.                                                                                                         |
| 9   | Shared calibration data index                     | As a tuning engineer, I want a single "Calibration data index" dropdown shared across every parameter in the subgraph, since a configured CKV applies to all parameters uniformly.                                                                                                                   | High       | Functional | Reuses module tab's shared `IndexSelect` directly, placed at the tab level like `cal-data-panel.tsx` — no deviation.                                                                                                                                 |
| 10  | Unsaved-changes guard on index switch             | As a tuning engineer, I want to be warned before losing unsaved changes when I switch the Calibration data index, so I don't silently lose edits.                                                                                                                                                    | High       | Functional | Guards only the shared CKV index switch — checking/unchecking which parameters are displayed is non-destructive (edits are keyed by element path, not by selection) and needs no guard, confirmed against `GenericTreeView`'s actual dirty-tracking. |
| 11  | Key Configurator panel toggle                     | As a tuning engineer, I want a "Key Configurator" button that opens a third resizable panel for managing the subgraph's configured CKVs, with no panel title needed — CKVs are subgraph-wide, not tied to which parameters are checked, so there is no per-parameter identity for a title to convey. | High       | Functional | Three panels total when open. No dynamic title.                                                                                                                                                                                                      |
| 12  | Configured CKVs list                              | As a tuning engineer, I want to search, add, delete, and copy configured CKVs for the subgraph.                                                                                                                                                                                                      | High       | Functional | Reuses `ConfigSummaryView`; no edit affordance.                                                                                                                                                                                                      |
| 13  | Empty state                                       | As a tuning engineer, I want a plain text empty state when no CKVs are configured, with no auto-opened Add flow.                                                                                                                                                                                     | Medium     | Functional | —                                                                                                                                                                                                                                                    |
| 14  | Available Keys picker (voice-filtered)            | As a tuning engineer, I want Add to show only voice-applicable keys (`isVoice === true`), so I don't see irrelevant keys.                                                                                                                                                                            | High       | Functional | Reuses module CKV key-fetch + cache.                                                                                                                                                                                                                 |
| 15  | Picker search/expand/collapse                     | As a tuning engineer, I want the same Search/Expand All/Collapse All behavior as the module CKV picker.                                                                                                                                                                                              | High       | Functional | —                                                                                                                                                                                                                                                    |
| 16  | Bulk delete by filter                             | As a tuning engineer, I want to delete all search-filtered CKVs at once, not via checkbox multi-select.                                                                                                                                                                                              | Medium     | Functional | Reuses `handleDeleteFiltered` pattern.                                                                                                                                                                                                               |
| 17  | No parameter section / no extra chrome            | As a tuning engineer, I don't want a parameter section or expand/collapse/close chrome inherited from the module Key Configurator view inside this panel.                                                                                                                                            | High       | Functional | Scope guard.                                                                                                                                                                                                                                         |
| 18  | Add CKV                                           | As a tuning engineer, I want Add to create a new CKV, which the backend applies to every parameter in the subgraph, updating the single shared Configured CKVs list and index dropdown.                                                                                                              | High       | Functional | `POST .../vcpm-ckv` `{ckv:[{valueSystemIds:[...]}]}`. Add-scoping confirmed — broadcasts to all parameters.                                                                                                                                          |
| 19  | Delete CKV                                        | As a tuning engineer, I want Delete to remove a CKV from the backend and reflect that removal locally.                                                                                                                                                                                               | High       | Functional | `DELETE .../vcpm-ckv/{ckvSystemId}` (204, no body). Success/failure read from HTTP status only; frontend removes exactly the requested id.                                                                                                           |
| 20  | Post-delete selection shift                       | As a tuning engineer, I want the view to shift to the next available CKV if the one I was viewing gets deleted.                                                                                                                                                                                      | High       | Functional | Single shared list/dropdown selection — no per-parameter reconciliation needed.                                                                                                                                                                      |
| 21  | Update parameter cal data                         | As a tuning engineer, I want Set to save the current parameter's edited data for the selected CKV.                                                                                                                                                                                                   | High       | Functional | `.../vcpm-ckv/{ckvSystemId}/cal-data` `{elements, systemId, name}`. Verb confirmed `PUT`.                                                                                                                                                            |
| 22  | Key Configurator button respects edit mode        | As a tuning engineer, I want the Key Configurator button enabled only while Graph Designer is in edit mode, and disabled in read-only mode, so I can't try to manage CKVs when changes can't be saved.                                                                                               | High       | Functional | If the panel is already open when edit mode is exited, it auto-closes immediately — does not degrade to read-only, unlike the existing module/subgraph Key Configurators.                                                                            |
| 23  | VCPM tab closes on subgraph deletion              | As a tuning engineer, I want the VCPM tab to close automatically if its subgraph is deleted while the tab is open, since there's nothing left to Get/Set against.                                                                                                                                    | High       | Functional | Closes silently — no unsaved-changes confirm dialog, since the subgraph is gone and confirming changes nothing.                                                                                                                                      |
| 24  | VCPM tab closes when Scenario ID leaves VoiceCall | As a tuning engineer, I want the VCPM tab to close automatically if the subgraph's Scenario ID is edited away from `VoiceCall` while the tab is open, since it's no longer VCPM-eligible.                                                                                                            | High       | Functional | Same silent-close behavior as requirement 23. Deselecting the subgraph alone (no delete, no Scenario ID change) does NOT close the tab.                                                                                                              |
