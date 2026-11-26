# VCPM Configuration — Design

Requirements: [requirements.md](requirements.md)

## User Interaction and Design

### Trigger → tab open

1. User selects a subgraph with Scenario ID = `VoiceCall`. The "VCPM
   Config" button appears next to the Scenario ID dropdown
   (`subgraph-properties-card.tsx`), computed from already-fetched schema
   data — no extra fetch, matched by `naturalId === SCENARIO_PROPERTY_ID`
   (`0x08001010`) and the property's value against the confirmed
   `VoiceCall` value (`3`).
2. Click → `properties-panel-host.tsx`'s new local handler:
   - dedupe-checks the store's `vcpmOpenTabs[subgraphId]`; if an open tab
     exists, focuses it via `useProjectLayoutStore.getState().setActiveProjectTab`
   - guards the async gap with its own `useRef(new Set<string>())` (mirrors,
     does not share, `graph-designer.tsx`'s `pendingModuleOpensRef`)
   - calls `store.getState().queryVcpmData(subgraphId, subgraphName)`
   - on success, builds the tab title via `formatDisplayId`, creates the
     tab via `tabLayoutService.createProjectTab(title, <GraphDesignerStoreContext.Provider value={store}><VcpmDataTab .../></GraphDesignerStoreContext.Provider>, canClose, onClose)`
     (own `useRef` tab-handle map for `canClose`, mirroring
     `moduleDataTabRefs`)
   - calls `store.getState().setVcpmOpenTab(subgraphId, tab.id)`
   - `onClose` clears the tab-handle entry, calls `setVcpmOpenTab(subgraphId, null)`
     and `clearVcpmData(subgraphId)`
3. This callback threads down as a prop through `PropertiesPanel` →
   `SubgraphPropertiesCard` → `SubgraphPropertiesCardBody`, the same way
   `onSubgraphNameChange` etc. are threaded today — `widgets/properties-panel`
   stays fully store-decoupled.

### Tab force-close

`PropertiesPanelHost` already re-renders on every `graphData` change (it
subscribes to `state.graphData` for the properties cards). A `useEffect`
in the same component — colocated with the open handler above, not a
separate watcher — iterates `state.vcpmOpenTabs`; for each
`[subgraphId, tabId]` pair with a non-null `tabId`, it checks:

- the subgraph still exists in `graphData.subgraphs`, and
- its Scenario ID property (`naturalId === SCENARIO_PROPERTY_ID`, same
  lookup as the trigger button) is still `VoiceCall`.

If either check fails, it force-closes the tab: runs the same cleanup as
a user-initiated close (`setVcpmOpenTab(subgraphId, null)`,
`clearVcpmData(subgraphId)`, drop the tab-handle ref) and removes the tab
from the layout via `useProjectLayoutStore.getState().removeProjectTab(activeProjectGroupId, tabId)`
— the same pair of calls `project-layout-manager.tsx` already uses
elsewhere to close a project tab programmatically
(`onProjectClose(...)` followed by `store.removeProjectTab(...)`). No
unsaved-changes confirm dialog — the subgraph (or its VCPM eligibility)
is already gone, so there is nothing to confirm.

This check only fires on `graphData` changes (deletion, Scenario ID
edit); it does **not** run on canvas-selection changes, so deselecting
the subgraph leaves the tab open, matching the module tab's existing
selection-independent behavior.

### VCPM Data tab

```
widgets/vcpm-data-tab/ui/vcpm-data-tab.tsx   (VcpmDataTab, forwardRef<VcpmDataTabHandle>)
├─ Tabs.Root (vertical rail — single "VCPM Data" entry, mirrors module-data-tab.tsx)
├─ IndexSelect (promoted from widgets/module-data-tab) — one shared "Calibration
│    data index" dropdown for the whole subgraph, same placement/scope as
│    cal-data-panel.tsx's usage; rendered only when the canonical CKV list has
│    more than one entry, same gating rule as the module tab
├─ Get / Set buttons (same enablement rule as module tab)
├─ "Key Configurator" toggle button (enabled only in edit mode — requirement 22)
├─ [resizable split — local panelSplitPct state in vcpm-data-tab.tsx, mirrors
│    generic-tree-view.tsx's own inline drag-resize pattern (there is only
│    one call site here, so extracting a shared hook isn't warranted)]
│  ├─ GenericTreeView (features/generic-tree-view — reused directly; already
│  │    publicly exported with no changes needed, see index.ts) — fed a
│  │    single TreeViewData built from the subgraph's VCPM parameters;
│  │    brings its own full Toolbar (Search, Collapse/Expand All, Modified
│  │    indicator, Legacy/Modern toggle, Basic/Advanced, PIDs/Ranges/Badges),
│  │    multi-select checkboxes, and vertical-stacked parameter detail
│  │    (Accordion) — all identical to the module tab, no exclusions
│  └─ features/key-configurator/vcpm-configurator-view/ui/vcpm-key-configurator-panel.tsx
│       (rendered only once Key Configurator opened)
│       ├─ no panel title — CKVs are subgraph-wide, not tied to which
│       │    parameters are checked, so there's no per-parameter identity
│       │    for a title to convey (requirement 11)
│       ├─ ConfigSummaryView (reused unmodified)
│       └─ "Add" → VcpmAvailableKeysPicker (new; isVoice-filtered)
```

`VcpmDataTab` is the only component in this tree wrapped in
`GraphDesignerStoreContext.Provider` and touching the Zustand store.
`GenericTreeView` stays pure/props-driven, same as its existing usage in
`module-data-panel-body.tsx`; everything under
`vcpm-key-configurator-panel.tsx` is likewise pure/props-driven
(`configuredCkvs`, `addVcpmCkvs`, `deleteVcpmCkv`, `voiceKeys` as props),
matching `calibration-keys-config-panel.tsx`'s existing pattern.

The "Key Configurator" toggle button is disabled whenever Graph Designer
is not in edit mode — `state.mode !== 'edit'`, read via
`useGraphDesignerStoreShallow`, the same binding `PropertiesPanelHost`
already uses for `isEditing` (requirement 22). `VcpmDataTab` holds
`isKeyConfiguratorOpen` as local component state, not slice state (it is
UI-session visibility scoped to this one open tab instance, not shared
store data); a `useEffect` watching `mode` sets it to `false` immediately
whenever `mode` leaves `'edit'`. This is a deliberate deviation from the
existing module/subgraph Key Configurators, which stay rendered and
degrade to a read-only view in the same situation — the VCPM panel has
its own open/close lifecycle (requirement 11), so "already open when edit
mode is lost" auto-closes instead of degrading.

Switching the selected CKV index goes through the promoted
`useIndexSwitchDialog` hook, guarding on the entry's dirty state — one
hook, one call site (requirement 10). Checking or unchecking which
parameters are displayed does **not** go through this guard:
`GenericTreeView` keys `dirtyPaths`/`elementValues` by element path, not
by selection, so toggling a parameter's checkbox never discards an edit
— confirmed by reading `generic-tree-view.tsx`.

## Component Design

Four layers participate, respecting Feature-Sliced Design boundaries (no
feature imports another feature directly): `features/graph-designer` (the
two new slices), `entities/vcpm` (DTOs + API functions), `entities/key-
configurator` (the `isVoice` filter, extending existing CKV transforms),
and `widgets/vcpm-data-tab` / `features/key-configurator/vcpm-configurator-
view` (presentation).

### Front-End Interfaces

**State — new slices** (`features/graph-designer/model/`):

```ts
// vcpm-data-slice.ts
export interface VcpmParameterSummary {
  name: string;
  systemId: string;
}

export interface VcpmCalDataEntry {
  calData?: VcpmParameterCalDataDto;
  dirtyPaths: Set<string>;
  invalidPaths: Set<string>;
  isSaving?: boolean;
  parameters: VcpmParameterSummary[];
  selectedCkvSystemId?: string; // subgraph-wide "Calibration data index" — shared across every parameter, persists across parameter switches
  status: SliceStatus;
  uiState?: GenericTreeViewUiState; // selectedIds (multi-select), panelSplitPct, etc. — reuse shape from shared/lib/tree-view-ui-state.ts
}

export interface VcpmDataSlice {
  clearVcpmData: (subgraphSystemId: string) => void;
  queryVcpmData: (
    subgraphSystemId: string,
    subgraphName: string,
  ) => Promise<boolean>;
  selectVcpmCalIndex: (subgraphSystemId: string, ckvSystemId: string) => void;
  setVcpmCalData: (
    subgraphSystemId: string,
    parameterSystemId: string,
    body: UpdateVcpmCalDataRequestDto,
  ) => Promise<boolean>;
  setVcpmOpenTab: (subgraphSystemId: string, tabId: string | null) => void;
  setVcpmUiState: (
    subgraphSystemId: string,
    patch: Partial<GenericTreeViewUiState>,
  ) => void;
  vcpmDataBySubgraphId: Record<string, VcpmCalDataEntry>;
  vcpmOpenTabs: Record<string, string | null>;
}

// vcpm-key-config-slice.ts
export interface VcpmKeyConfigSlice {
  addVcpmCkvs: (
    subgraphSystemId: string,
    valueSystemIdCombinations: string[][],
  ) => Promise<boolean>;
  configuredVcpmCkvsBySubgraphId: Record<string, ConfiguredCkv[]>; // one canonical list per subgraph, applies to every parameter uniformly — reuses ConfiguredCkv as-is, no VCPM-specific extension needed
  deleteVcpmCkv: (
    subgraphSystemId: string,
    ckvSystemId: string,
  ) => Promise<boolean>;
}
```

Both slices spread into `GraphDesignerStore` exactly like the existing 21
slices today. Cross-slice calls go through `get()`, the same pattern
`CalibrationKeyConfigSlice.addCkvs` uses when calling
`get().updateModuleCkvsLocal`.

**Data flow — one canonical CKV list, consumed directly, no per-parameter
filter.** Because the backend confirmed Add broadcasts to every parameter
(requirements.md Assumptions), `configuredVcpmCkvsBySubgraphId[subgraphId]`
_is_ the dropdown's option list — there is no per-parameter subset to
derive, and therefore no `selectCalIndexOptions`-style selector at all.
This also sidesteps the module tab's known `IndexSelect` sync gap (there,
the CKV list and the dropdown's cached `availableCalIndices` are two
separate fields that never reconcile after Add/Delete) by construction:
one list, read directly by both the list UI and the dropdown.

- **Add**: backend-first-write-back (call `POST .../vcpm-ckv` first; on
  success, append the returned CKV(s) to the canonical list — they apply
  to every parameter, so no association bookkeeping is needed). If
  `selectedCkvSystemId` was unset, set it to the new CKV's `systemId`.
- **Delete**: call `DELETE .../vcpm-ckv/{ckvSystemId}` first. The endpoint
  returns no response body in either case (confirmed — see
  requirements.md Assumptions), so success/failure is read purely from
  `hasBlockingIssues(result)`. This is the one slice action that
  deliberately does **not** add the `|| !result.data` term every other
  mutation here uses (see Error Handling below) — `result.data` is always
  `undefined` for this endpoint by design, not a failure signal. On
  success, remove exactly the requested `ckvSystemId` from the canonical
  list inline in the slice action —
  `configuredCkvs.filter((ckv) => ckv.systemId !== ckvSystemId)`. There is
  no cascade to reconcile, so a dedicated
  `entities/vcpm/lib/vcpm.transform.ts` function isn't warranted for a
  single-line filter.

  If `selectedCkvSystemId` was deleted, assign the first remaining entry in
  the canonical list (or `undefined` if it's now empty) — satisfies the
  post-delete selection shift requirement directly off the one list, not a
  hand-written special case and not a second derivation step.

**`isVoice` filter** — reuse the existing cache, no new fetch:
`CalibrationKeyConfigSlice.calibrationKeys` (populated once per project tab
by `initializeCalibrationKeyConfiguration` → `getAllKeyDefinitions(projectId)`)
is project-scoped, not module-scoped — valid input for VCPM's Available Keys
picker. New helper:

```ts
// entities/key-configurator/lib/ckv.transform.ts (extend)
export function filterVoiceKeys(
  keys: Record<string, GraphKey>,
  keyDefinitions: KeyDefinitionResponseDto[],
): Record<string, GraphKey>;
```

**Component tree** — see User Interaction and Design above. The parameter
list and parameter detail panes are **not** new bespoke components —
`GenericTreeView` (`features/generic-tree-view`, already fully exported,
no changes needed) is reused directly, exactly as
`module-data-panel-body.tsx` reuses it today, giving multi-select
checkboxes and vertical-stacked (`Accordion`) parameter detail for free.
The only genuinely new presentational component is `VcpmAvailableKeysPicker`.
The Calibration data index dropdown itself is not a new component either
— it's the promoted `IndexSelect` (see Promotion to `shared/` in
requirements.md), reused directly, same as the module tab. The tab-level
resizable split (`GenericTreeView` pane | Key Configurator pane) is simple
local `panelSplitPct` state in `vcpm-data-tab.tsx`, mirroring
`generic-tree-view.tsx`'s own inline drag-resize handlers — with only one
call site needed here, extracting a shared `shared/lib/use-resizable-split.ts`
hook is not warranted.

### Back-End (API + Database Design)

Database design is backend-owned; no new frontend-local persistent storage
is introduced (Zustand state here is in-memory/session-scoped, not
persisted to disk or IndexedDB).

API surface consumed (all under
`/arc-api/v1/projects/{projectId}/subgraphs/{subgraphSystemId}/vcpm-ckv`):

| Verb   | Path suffix               | Body                               | Response                                            |
| ------ | ------------------------- | ---------------------------------- | --------------------------------------------------- |
| GET    | _(none)_                  | —                                  | `{ckv: VcpmCkvDto[]}`                               |
| POST   | _(none)_                  | `{ckv: [{valueSystemIds: [...]}]}` | `{addedCkvs, removedCkvSystemIds}` (assumed)        |
| DELETE | `/{ckvSystemId}`          | —                                  | 204, no body — success/failure via HTTP status only |
| PUT    | `/{ckvSystemId}/cal-data` | `{elements, systemId, name}`       | `VcpmParameterCalDataDto`                           |

```ts
// entities/vcpm/model/vcpm.dto.ts
export interface VcpmCkvDto {
  keyValuePairs: KeyValueInfo[]; // reuse from entities/spf-module-data/model/spf-module-common.dto.ts
  systemId: string;
  // No association field — every CKV applies to every parameter (confirmed).
}
export interface VcpmCkvListResponseDto {
  ckv: VcpmCkvDto[];
}

export interface CreateVcpmCkvsRequestDto {
  ckv: Array<{valueSystemIds: string[]}>;
}
export interface AddVcpmCkvsResponseDto {
  addedCkvs: VcpmCkvDto[];
  removedCkvSystemIds: string[];
}

export interface UpdateVcpmCalDataRequestDto {
  elements: AnyElementDto[];
  name: string;
  systemId: string;
}
export interface VcpmParameterCalDataDto {
  elements: AnyElementDto[];
  name: string;
  systemId: string;
}
```

### Interfaces-Services

```ts
// entities/vcpm/api/vcpm-api.ts — plain positional args, httpClient wrapper, mirrors spf-module-api.ts
export async function getVcpmCkvs(
  projectId: string,
  subgraphId: string,
): Promise<ApiResult<VcpmCkvListResponseDto>>;
export async function createVcpmCkvs(
  projectId: string,
  subgraphId: string,
  body: CreateVcpmCkvsRequestDto,
): Promise<ApiResult<AddVcpmCkvsResponseDto>>;
export async function deleteVcpmCkv(
  projectId: string,
  subgraphId: string,
  ckvSystemId: string,
): Promise<ApiResult<void>>;
export async function updateVcpmCalData(
  projectId: string,
  subgraphId: string,
  ckvSystemId: string,
  body: UpdateVcpmCalDataRequestDto,
): Promise<ApiResult<VcpmParameterCalDataDto>>;
```

### Error Handling

Mirror `CalibrationKeyConfigSlice` exactly for every new slice action:
`try/catch/finally` (loading flags set before `await`, cleared in
`finally`); check `hasBlockingIssues(result)` before touching `result.data`;
on failure, `showToast(getIssueMessage(result, fallback), 'danger')` +
`logger.error(message, {action, component, error})`, return `false`, leave
state untouched (dirty values, open Add selection preserved); on success,
write through a single local-write function (backend-first-write-back, no
optimistic mutation before `await` resolves).

**Exception — `deleteVcpmCkv`:** the Delete CKV endpoint returns no
response body at all, success or failure (confirmed — see
requirements.md Assumptions), so its success check is
`hasBlockingIssues(result)` alone, without the `|| !result.data` term
every other action here adds — `data` is always `undefined` by design,
not a failure signal. This depends on a `processApiResponse` fix in
`shared/api/utils.ts` (see requirements.md Architectural Impacts): today
a bodyless 2xx response is misclassified as an `INVALID_JSON` transport
issue, which would make `hasBlockingIssues` report a successful delete as
a failure.

## Security Considerations

- All new API calls route through the existing `httpClient` wrapper — no
  new auth/session handling, project-scoped access control is inherited
  from the existing session.
- All identifiers exchanged with the backend (`subgraphSystemId`,
  `parameterSystemId`, `ckvSystemId`, `valueSystemIds`) are opaque
  system-generated IDs already known to the client from prior API
  responses — no raw user text is sent to these endpoints, so there is no
  injection surface introduced by this feature.
- The Available Keys picker's `isVoice` filter is a display-only filter;
  the backend remains the authority on which keys are valid for a given
  Add — the frontend filter is a UX convenience, not a security boundary.

## Performance/Scalability Considerations

- One GET per VCPM tab open (not per parameter) — the full parameter +
  CKV set for the subgraph is fetched once and cached in
  `vcpmDataBySubgraphId`.
- Key definitions (`calibrationKeys`) are fetched once per project tab via
  the existing idempotent `initializeCalibrationKeyConfiguration`, shared
  with the module CKV feature — no duplicate fetch when both tabs are open.
- The single canonical CKV list, read directly by both the parameter list
  and the shared dropdown (see Front-End Interfaces above), avoids the
  module tab's dual-cache reconciliation cost and risk of stale dropdown
  state after Add/Delete — and needs no per-parameter filtering step at
  all, since every CKV applies to every parameter.

## Testing Strategy

- `tests/features/graph-designer/model/vcpm-data-slice.test.ts`: empty
  initial state; `queryVcpmData` success/failure (state untouched + `false`
  on blocking issue); `setVcpmUiState` merges the patch into `uiState`
  (e.g. `selectedIds`) without touching `selectedCkvSystemId` (regression
  guard — the shared index is subgraph-wide, not reset by changing which
  parameters are checked); `setVcpmCalData` writes back only on success;
  `clearVcpmData` removes the subgraph entry.
- `tests/features/graph-designer/model/vcpm-key-config-slice.test.ts`:
  `addVcpmCkvs` success appends the returned CKV(s) to the single
  canonical list with no per-parameter association tracked (regression
  guard for the confirmed Add-scoping behavior); `addVcpmCkvs` failure
  leaves list unchanged; `deleteVcpmCkv` success removes exactly the
  requested `ckvSystemId` from the canonical list and shifts
  `selectedCkvSystemId` to next available (and to `undefined` when none
  remain); `deleteVcpmCkv` treats a bodyless 2xx response as success
  (regression guard — must check `hasBlockingIssues(result)` alone, not
  `result.data`).
- Component tests (`tests/widgets/vcpm-data-tab/...`, RTL): `VcpmDataTab`
  renders `GenericTreeView` with multi-select checkboxes present and
  checking multiple parameters stacks their detail vertically (relies on
  `GenericTreeView`'s own existing coverage for the checkbox/accordion
  mechanics — these tests confirm wiring, not re-test the engine);
  Set-button enablement, Get/Search/Collapse/Expand wiring, unsaved-changes
  dialog on CKV-index switch only (toggling a parameter's checkbox does
  _not_ trigger the dialog — regression guard); Key Configurator button
  disabled when `mode !== 'edit'`, and an already-open panel closes
  immediately when `mode` transitions away from `'edit'` (requirement 22);
  `vcpm-key-configurator-panel.test.tsx` — plain-text empty state,
  Available Keys shows only `isVoice === true`, bulk delete mirrors
  `handleDeleteFiltered`'s existing coverage, no edit affordance
  rendered.
- `tests/widgets/graph-designer/ui/properties-panel-host.test.tsx` (tab
  force-close): deleting the open tab's subgraph closes it silently, no
  confirm dialog, even with dirty state present (requirement 23); editing
  the Scenario ID away from `VoiceCall` closes it the same way
  (requirement 24); deselecting the subgraph (no delete, no Scenario ID
  change) leaves the tab open (regression guard for the module-tab-parity
  clarification in requirements.md).
- Manual: open a project with a `VoiceCall`-scenario subgraph (Scenario
  ID value `3`), confirm the VCPM Config button appears only for that
  subgraph, opens the tab with correct title, parameter list shows
  multi-select checkboxes with each
  checked parameter's detail stacked vertically below it, the shared
  Calibration data index dropdown updates immediately after Add/Delete and
  reflects the same options regardless of which parameters are checked,
  Set is disabled/enabled per the same rules as the module tab, and the
  Available Keys picker only shows `isVoice` keys.
- `pnpm lint` / `pnpm format` for repo-wide conventions.

## Open-Source Libraries

None introduced. Feature reuses existing dependencies already in the repo
(`@qualcomm-ui/react`, `zustand`, `@xyflow/react` is not needed here).

## Not Doing

- Editing an existing Configured CKV's key/value selection from the VCPM
  Key Configurator panel (delete and copy only, no edit).
- Any change to the existing, docked, selection-driven Key Configurator
  feature (`widgets/key-configurator-panel`,
  `features/key-configurator/module-configurator-view`) beyond adding a
  new sibling view.
- Closing the VCPM tab on mere subgraph deselection — the tab stays open
  independent of canvas selection, same as the module tab today. Only
  subgraph deletion and Scenario ID leaving `VoiceCall` close it
  (requirements 23–24).
- Fixing the module tab's own tab-force-close gap (deleting a module
  today leaves its `ModuleDataTab` open and orphaned) — identified during
  this review as existing, pre-existing behavior; out of scope here since
  it's not a VCPM regression, just an unrelated existing gap.
- A per-parameter Calibration data index dropdown — superseded by the
  backend's confirmation that Add broadcasts to every parameter (see
  requirements.md Assumptions); the VCPM tab reuses the module tab's
  shared `IndexSelect` directly instead.
