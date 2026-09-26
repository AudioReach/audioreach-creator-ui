# Calibration Keys (CKV) — Design

Requirements: [requirements.md](requirements.md)

## User Interaction and Design

The Calibration Keys view configures calibration key vectors for a module
instance. Clicking a module instance in the graph renders this view inside
the Key Configurator Panel, showing that instance's configured CKVs and
letting the user add, edit, or delete configurations for it.

Whether the user can modify anything is governed by editability, not by
this view itself: in Offline mode, editing is only permitted when graph
edit mode is enabled; in RTC mode the panel is always read-only. In
read-only mode, the view is display-only — configured CKVs are visible but
add/edit/delete are unavailable. In edit mode, the user has full add,
edit, and delete access.

Unlike TKV, CKV has no tag grouping: Configured CKVs render as a flat list
(requirement 2), and Add/Edit can select values across multiple keys at
once, with Apply expanding every combination into its own flat entry via a
Cartesian product (requirement 8).

### Design Layout:

```
+------------------------------------------------------------------+
| Calibration Keys                                          [+ Add] |
+------------------------------------------------------------------+

▼ Configured CKVs
--------------------------------------------------------------------

   [Edit] [Delete]  [key_a: val_1] [key_b: val_3]            [Copy]

   [Edit] [Delete]  [key_a: val_2] [key_b: val_3]            [Copy]

   [Edit] [Delete]  [key_c: val_7]                           [Copy]


▼ Configure PID's for CKVs
--------------------------------------------------------------------

+--------------+------------+-------------------------+
| Support CKV  | PID        | Name                    |
+--------------+------------+-------------------------+
| [x]          | 0x8002010  | PARAM_ID_CAL_1          |
| [x]          | 0x8002011  | PARAM_ID_CAL_2          |
| [x]          | 0x8002012  | PARAM_ID_CAL_3          |
+--------------+------------+-------------------------+


Search: [key_a: val_1 key_b: val_3________________________]
         ┌───────────────────────────────┐
         │ val_4      Key: key_b          │  ← suggestion popup
         │ val_4      Key: key_d          │  ← same value, two keys
         └───────────────────────────────┘

+--------------------------------------------------------+-----------------+
| Key ID                    | Key                        | [Expand][Collapse] |
+--------------------------------------------------------+-----------------+

▼ □ KEY001                 | key_a

    ■ VAL001                | val_1
    □ VAL002                | val_2

▼ □ KEY002                 | key_b

    □ VAL010                | val_3
    □ VAL011                | val_4

---------------------------------------------------------------

▶ □ KEY004                 | key_d

+--------------------------------------------------------------+

                    [ Apply ]   [ Cancel ]
```

The displayed strings above assume the Usecase Name preference is
`keyvalues` (requirement 28) — `[key: value]` pairs, space-joined. Under
`alias`/`values`, the same rows render value names only, `+`-joined, no
brackets (e.g. `val_1+val_3`). The PID table above shows the zero-config
default state (requirement 3): nothing has been configured yet, so every
PID defaults to checked.

The search box above illustrates the one real divergence from TKV: because
CKV has no single-key lock (requirement 8), typing a bare value name that
exists under more than one key (`val_4` under both `key_b` and `key_d`) is
genuinely ambiguous — the suggestion popup surfaces both candidates rather
than resolving to one, the same situation SGKV's search already handles for
subgraph key vectors.

## Component Design

Four layers participate, respecting Feature-Sliced Design boundaries (no
feature imports another feature directly):

- **`features/graph-designer`** — a new `CalibrationKeyConfigSlice` owns
  the available calibration key definitions and the actions that add,
  remove, and update configured CKVs on Graph Data, scoped per project tab,
  composed into `GraphDesignerStore` alongside `KeyConfigSlice` and TKV's
  `ModuleTagKeyConfigSlice`. `KeyConfigSlice` stays the thin orchestrator
  the widget calls, reaching `CalibrationKeyConfigSlice` via `get()` — the
  same cross-slice pattern `ModuleDataSlice` and TKV's design already use.
- **`entities/key-configurator`** — pure DTO↔UI transform functions
  (`CkvDto[]` ↔ `ConfiguredCkv[]`), no fetch or store access, so
  `graph-designer` can reach them without a feature-to-feature import.
- **`shared/types`** — `CkvParameter`/`ConfiguredCkv` move here (today
  they live in the feature-local `calibration-keys-config.types.ts`),
  matching where TKV's `TagGroup`/`TkvParameter`/`ConfiguredTkv` already
  moved to.
- **`widgets/key-configurator-panel`** — the only layer with legitimate
  access to both `key-configurator` (selection) and `graph-designer` (the
  slices). Resolves the selected module instance and passes its data down
  as props.

The CKV panel itself becomes purely presentational — no store access — so
it no longer needs to reach into another feature's state at all.

Multi-module selection (requirement 23 — each Ctrl+Click-selected module
getting its own independent CKV panel) is unaffected by this design: that
behavior lives in the shared `ConfiguratorPanel`/`ModuleConfigurationPanel`
layout, which already renders one configuration view per selected item and
is not changed here. `CalibrationKeyConfigSlice`'s mutation actions take
`instanceSystemId` as a parameter and write directly into
`graphData.moduleInstances[instanceSystemId]`, so each panel instance
naturally reads and writes only its own instance's data.

### Closing the Store-Wiring Gap

TKV's approved design assumes `widgets/key-configurator-panel/ui/key-configurator-panel.tsx`
already reads `KeyConfigSlice`/`ModuleTagKeyConfigSlice` via
`useKeyConfigurator()`. In the live codebase today this is not the case:
the widget's per-item initialization effect calls `initializeConfiguration`
from `useKeyConfiguratorSelectionStore()` — a separate store
(`features/key-configurator/model/key-configurator-store.ts`,
`KeyConfiguratorStore`) — for every item type, including `MODULE`.
`useKeyConfigurator()` (the `GraphDesignerStore` selector TKV's design
relies on) is defined but is not called anywhere in the codebase today.
Without rewiring the widget, neither TKV's nor CKV's slice-based state is
reachable from the real UI, regardless of how correctly the slice itself is
built.

This design includes that rewiring as part of CKV's scope, since it is a
one-time change that both features need and neither has made yet:

- `KeyConfiguratorPanel`'s per-item effect (`key-configurator-panel.tsx`,
  the `useEffect` calling `initializeConfiguration` for each selected item)
  changes its `MODULE` branch to call
  `useGraphDesignerStoreShallow().initializeConfiguration` instead of
  `useKeyConfiguratorSelectionStore().initializeConfiguration`. This is the
  same `KeyConfigSlice.initializeConfiguration` action TKV's design already
  extends to call both `initializeModuleTagKeyConfiguration` and (per this
  design) `initializeCalibrationKeyConfiguration`.
- `SUBSYSTEM` items are untouched — still routed through
  `KeyConfiguratorStore`, since subsystem configuration is out of scope for
  both TKV and CKV.
- `selectedItems`/`projectId`/`setSelectedItems` stay owned by
  `KeyConfiguratorStore`, unchanged — only the per-`MODULE`-item
  configuration-fetch call moves to `GraphDesignerStore`.
- `mapItemToConfigurationContext` (today building a
  `KeyConfiguratorStore`-shaped `ConfigurationContext`) gains a parallel
  mapping to the `GraphDesignerStore`-side context shape (per Decision D4:
  the two features' context types are independently defined; the widget is
  the translation point).

Once this lands, `KeyConfiguratorStore`'s `MODULE` branch of
`initializeConfiguration` (`moduleInstanceCoordinator.fetchAndDistributeModuleInstanceData`,
`useCalibrationKeysStore`, `useModuleTagKeysStore`) becomes dead code and is
deleted — satisfying requirement 22's retirement of the standalone
`calibration-keys-store.ts`, and the equivalent for `module-tag-keys-store.ts`.
`KeyConfiguratorStore` itself is not deleted (it still owns subsystem/
selection state) — only its `MODULE` branch and the two standalone stores it
delegates to are removed.

### Tab-Mounting Fix (Requirement 26)

`ModuleConfigurationPanel` (`features/key-configurator/module-configurator-view/ui/module-configuration-panel.tsx`)
currently wraps each `Tabs.Panel` in an additional
`{activeTab === 'x' && <Tabs.Panel>...}` conditional, which unmounts
`CalibrationKeysConfigPanel`/`ModuleTagKeysConfigPanel` whenever the other
tab is active. This is unnecessary: QUI's `Tabs.Panel` already defaults
`lazyMount`/`unmountOnExit` to `false`, meaning both panels mount once and
the inactive one is hidden via `hidden`/`display: none` (CSS), not removed
from the DOM. The fix is to delete the outer `{activeTab === 'x' && ...}`
conditionals and render both `Tabs.Panel`s unconditionally, relying on
QUI's own visibility handling:

```tsx
<Tabs.Root defaultValue="calibration" size="xl">
  <Tabs.List>...</Tabs.List>
  <Tabs.Panel value="calibration">
    <CalibrationKeysConfigPanel instanceId={instanceId} isEditable={isEditable} moduleId={moduleId} />
  </Tabs.Panel>
  <Tabs.Panel value="module-tag">
    <ModuleTagKeysConfigPanel instanceId={instanceId} isEditable={isEditable} moduleId={moduleId} />
  </Tabs.Panel>
</Tabs.Root>
```

No new QUI prop or component is needed. In-progress local `useState` inside
`CalibrationKeysConfigPanel` (`editingIndex`, `selectedKeyValues`,
`searchTerm`, `expandedKeys`, sort order, etc.) is preserved automatically
because the component is never unmounted while the Module Tag Keys tab is
active — it stays local state, with no change required to move it into any
slice. The module-configuration tab structure itself — both Calibration
Keys and Module Tag Keys tabs rendering when a module is clicked — is
unchanged.

### Front-End Interfaces

**`features/graph-designer/model/calibration-key-config-slice.ts`** (new
file) — owns the calibration key definitions cache and the actions that
mutate configured CKVs on Graph Data:

```typescript
interface CalibrationKeyConfigSlice {
  availableCalibrationKeys: Record<string, CalibrationKey>;  // definitions, fetched once per tab

  initializeCalibrationKeyConfiguration: (projectId: string) => Promise<boolean>;
  resetCalibrationKeyConfiguration: () => void;

  removeConfiguredCkv: (instanceSystemId: string, index: number) => void;
  updateConfiguredCkvs: (instanceSystemId: string, ckvs: ConfiguredCkv[]) => void;
}
```

Unlike TKV, there is no `addConfiguredCkv`. Requirement 8's Cartesian-product
expansion means a single Add's Apply click can produce more than one new
entry at once; computing the full target array in the panel and making one
`updateConfiguredCkvs` call covers both Add and Edit with a single
read-mutate-write-back pass each, instead of looping a single-entry add
action once per generated combination (which would mean N separate
`markDirty()`/duplicate-check passes for one Apply click). `removeConfiguredCkv`
stays single-entry since Delete always removes exactly one existing row.

`availableCalibrationKeys` is key _definitions_, shared across every module
instance in the current project tab. `initializeCalibrationKeyConfiguration(projectId)`
returns early if `availableCalibrationKeys` is already populated; otherwise
it calls `getAllKeyDefinitions(projectId)` and stores the result through
`transformKeyDefinitionsToCalibrationKeys`. `resetCalibrationKeyConfiguration()`
clears `availableCalibrationKeys`, so the next
`initializeCalibrationKeyConfiguration` call re-fetches.

A module instance's configured CKVs are not stored on this slice at all —
`selectConfiguredCkvs(state, instanceSystemId)` reads
`graphData.moduleInstances[instanceSystemId]?.ckvs` directly and transforms
it through `transformCkvsToConfiguredCkvs` (see Interfaces-Services below)
into `ConfiguredCkv[]`. The panel calls this selector for display, and each
mutation action below calls it to read the current list immediately before
writing an updated one back.

#### Zero-Config PID Default (Requirement 3)

The PID checklist's baseline is also derived rather than stored. A selector
merges `moduleDefinitionsBySystemId[moduleDefinitionSystemId]
.paramDefinitionsSummaryInfo` (every PID the module supports) with the
instance's `ckvs[...].supportedParameters` (the subset currently checked)
to produce the panel's `CkvParameter[]` baseline. `CkvDto.supportedParameters`
is absent entirely on a never-configured instance, as opposed to
present-but-empty, so the selector branches on that distinction:

- If the instance's `ckvs` is absent or empty on Graph Data, every PID
  defaults to `checked: true` (requirement 3's "all PIDs selected by
  default").
- Otherwise, `checked` is derived from the loaded `CkvDto.supportedParameters`.

The panel seeds its own local `useState` from this baseline when the
Add/Edit PID section opens. Toggling a checkbox updates only that local
state; switching to a different module instance or clicking Cancel discards
it, and only Apply writes the chosen PIDs back, as part of the entry's
`pidConfig`.

`removeConfiguredCkv`/`updateConfiguredCkvs` each read the instance's
current configured CKVs via `selectConfiguredCkvs`, apply the mutation,
and call `get().updateModuleCkvsLocal(instanceSystemId, ckvs)` in the same
action, writing to Graph Data immediately (requirement 22). For Add, the
panel first expands the current multi-key selection into its full set of
Cartesian-product entries (requirement 8), appends that set to the
instance's current list, and passes the full result to
`updateConfiguredCkvs` in one call — not one `updateConfiguredCkvs` (or a
hypothetical single-entry add) per generated entry. For Edit, the panel
passes the current list with just the edited entry's values replaced:

```typescript
updateConfiguredCkvs: (instanceSystemId, ckvs) => {
  const keyDefinitionsByNaturalId = buildKeyDefinitionLookup(
    get().availableCalibrationKeys,
  );
  get().updateModuleCkvsLocal(
    instanceSystemId,
    transformConfiguredCkvsToCkvs(ckvs, keyDefinitionsByNaturalId),
  );
},
```

`removeConfiguredCkv` follows the same write-back pattern, reading via
`selectConfiguredCkvs`, filtering out the one entry at `index`, and calling
`updateModuleCkvsLocal` with the filtered result.

### CKV Identity

`ConfiguredCkv` (moving to `shared/types/key-configurator-config.types.ts`)
gains one field it does not have today:

```typescript
export interface ConfiguredCkv {
  keyValuePairs: Array<{key: CalibrationKey; value: KeyValue}>;
  pidConfig: number[];
  systemId: string; // this CKV entry's own identity
}
```

`systemId` is required once an entry is included in `selectConfiguredCkvs`'s
result, because every entry must round-trip back into a `CkvDto` on Apply,
and `CkvDto.systemId` is non-optional. An entry loaded from Graph Data
copies it directly from the source `CkvDto.systemId`.

An entry created through Add has no backend-assigned `CkvDto.systemId`
yet. The panel derives a deterministic composite key from the entry's own
key/value selection: the `systemId` of each selected `KeyInfo`/`ValueInfo`
pair, sorted and joined
(e.g. `"KEY_SYS_010:VAL_SYS_100|KEY_SYS_040:VAL_SYS_402"`). Because Apply
expands a multi-key selection into one entry per Cartesian-product
combination (requirement 8), each resulting row gets its own composite key
computed from that row's specific key/value pair, not from the full
pre-expansion selection. This is unique by construction, because
requirement 10 already forbids two entries on the same instance from
sharing an identical key-value combination, and it is built entirely from
backend-sourced data, with no client-generated value anywhere in it. The
composite is computed once, at Add, and never recomputed — editing an
already-loaded entry's key/value selection does not change its existing
`systemId`. This is deliberate: once an entry has an identity, even this
client-side composite stand-in, a later edit should read as "modify this
entry," not "delete it and create a new one," matching how a
backend-loaded entry's `systemId` already behaves across edits.

**Open question — composite-key stand-in.** Same open question as TKV's
design: this composite-key approach is a stand-in, not a confirmed backend
contract. Nothing confirms the backend accepts or expects a `CkvDto.systemId`
of this shape for a newly-created entry. This needs sign-off before
implementation, and may share a single resolution with TKV's identical
question (see Open Questions in requirements.md).

### Graph Data Write-Back

**`features/graph-designer/model/graph-data-slice.ts`** (extended) — gains
one new action, following the existing local-mutation pattern already used
by `updateModuleAliasLocal`/`updateModuleContainerLocal`/TKV's
`updateModuleTagsLocal`:

```typescript
updateModuleCkvsLocal: (moduleSystemId: string, ckvs: CkvDto[]): void => {
  const {graphData} = get();
  const current = graphData?.moduleInstances[moduleSystemId];
  if (!graphData || !current) {
    return;
  }
  set({
    graphData: {
      ...graphData,
      moduleInstances: {
        ...graphData.moduleInstances,
        [moduleSystemId]: {...current, ckvs},
      },
    },
  } as unknown as Partial<S>);
  get().markDirty();
},
```

`CalibrationKeyConfigSlice`'s mutation actions call this immediately after
deriving the instance's updated CKV list, so Graph Data and the read-side
selector it feeds (`selectConfiguredCkvs`) change together, in the same
user action, with no intermediate inconsistent render. `markDirty()` is the
same dirty-tracking mechanism every other Graph Data mutation already
triggers.

**`features/graph-designer/model/key-config-slice.ts`** — loses the
`CalibrationKey`-definitions responsibility it holds today, superseded by
`CalibrationKeyConfigSlice.availableCalibrationKeys`, populated the same
way TKV's `moduleTagKeys` is. Every other field (`isEditable`,
`keyConfigStatus`, `subgraphConfig`, `subsystemConfig`) and action keeps its
existing shape, unchanged by this design except for `initializeConfiguration`'s
module branch, which now awaits both slices:

```typescript
initializeConfiguration: async (context) => {
  if (context.itemType === 'module') {
    const [tkvSuccess, ckvSuccess] = await Promise.all([
      get().initializeModuleTagKeyConfiguration(context.projectId),
      get().initializeCalibrationKeyConfiguration(context.projectId),
    ]);
    const success = tkvSuccess && ckvSuccess;
    set({keyConfigStatus: success ? 'ready' : 'error'} as Partial<S>);
    return success;
  }
  // subgraph/subsystem branches: unchanged placeholder behavior
},

resetConfiguration: () => {
  get().resetModuleTagKeyConfiguration();
  get().resetCalibrationKeyConfiguration();
  // ...remaining reset of isEditable/keyConfigStatus/subgraphConfig/
  // subsystemConfig: unchanged
},

saveConfiguration: async () => {
  const {graphData} = get();
  // stub backend call, reading configured CKVs/TKVs straight from
  // graphData.moduleInstances — contract pending the Open Question below
  return true;
},
```

**`features/graph-designer/model/graph-designer-store.ts`** — the composed
type becomes `KeyConfigSlice & ModuleTagKeyConfigSlice &
CalibrationKeyConfigSlice & ...`; the creator spreads all three:
`...createKeyConfigSlice(set, get), ...createModuleTagKeyConfigSlice(set, get), ...createCalibrationKeyConfigSlice(set, get)`.
Cross-slice access happens only through `get()`.

### Copy, Display Format, and Search (Requirements 27–30)

#### Why CKV's Search Is Structurally Closer to SGKV Than to TKV

TKV's search/suggestion design (`tkv-search-resolver.ts`) is deliberately
simpler than SGKV's because TKV locks to a single tag group once the first
value is picked — candidates narrow to that one group, so there is no
cross-key ambiguity. CKV has no such lock: requirement 8's multi-key
selection means a user can have values selected under several keys at
once, so CKV's candidate space is every available key across the whole
module simultaneously — the same project-wide scope SGKV's search already
handles, including the same bare-value-name ambiguity (a value name
existing under more than one key) SGKV's `findDistinctKeyAssignment`
backtracking exists to resolve. This is a real complexity difference from
TKV, not an oversight — CKV's resolver reuses SGKV's disambiguation
approach rather than TKV's bounded one.

**`ckv-search-resolver.ts`** (new) exports the suggestion source:

```typescript
export interface CkvSearchSuggestion {
  key: CalibrationKey;
  value: KeyValue;
}

export function getCkvSearchSuggestions(
  queryText: string,
  availableCalibrationKeys: Record<string, CalibrationKey>,
  displayMode: CkvDisplayMode,
): CkvSearchSuggestion[];
```

Candidates are every value (and, in `key-value` mode, every key) across
every calibration key — the same project-wide set
`filteredAndSortedKeys`' existing substring filter already searches —
never narrowed to one key, since multiple keys stay selectable
simultaneously (requirement 8).

**`resolveCkvSearchInput`** mirrors SGKV's `resolveKvVectorInput` shape
(`empty`/`query`/`selection`/`ambiguous` discriminated union), but
disambiguates a bare value name against all calibration keys at once,
reusing SGKV's `findDistinctKeyAssignment` backtracking logic rather than
reimplementing TKV's simpler single-group matcher. That function is not
exported from its module today — it is private to
`subgraph-configurator-view/lib/add-kv-vector-editor.ts` with no call
sites outside that file — so this reuse requires lifting it to `shared/`
or otherwise making it reachable from both features first, since neither
feature may import the other directly; the exact target location is an
implementation detail for the writing-plans phase, not decided here:

```typescript
export type CkvSearchDiagnostic = {
  candidateKeyNames: string[];
  code: 'value-auto-resolved-by-key-id';
  severity: 'warning';
  valueName: string;
};

export type ResolvedCkvSearchInput =
  | {kind: 'empty'}
  | {queryText: string; kind: 'query'}
  | {
      kind: 'selection';
      pairs: Array<{key: CalibrationKey; value: KeyValue}>;
      queryText: string;
    }
  | {
      diagnostic: CkvSearchDiagnostic;
      kind: 'ambiguous';
      pairs: Array<{key: CalibrationKey; value: KeyValue}>;
      queryText: string;
    };

export function resolveCkvSearchInput(
  text: string,
  availableCalibrationKeys: Record<string, CalibrationKey>,
  displayMode: CkvDisplayMode,
): ResolvedCkvSearchInput;
```

Selecting a suggestion or clicking a table checkbox calls the same
`toggleValueSelection`/`toggleKeySelection` the table already calls — there
is no separate commit path, consistent with TKV's approach.

#### Display Format (Requirement 28)

```typescript
export type CkvDisplayMode = 'key-value' | 'value-only';

export function resolveCkvDisplayMode(
  namePreference: 'alias' | 'keyvalues' | 'values',
): CkvDisplayMode {
  return namePreference === 'keyvalues' ? 'key-value' : 'value-only';
}

export function formatCkvEntry(
  keyValuePairs: Array<{key: CalibrationKey; value: KeyValue}>,
  displayMode: CkvDisplayMode,
): string {
  if (displayMode === 'value-only') {
    return keyValuePairs.map((pair) => pair.value.name).join('+');
  }
  return keyValuePairs
    .map((pair) => `[${pair.key.name}: ${pair.value.name}]`)
    .join(' ');
}
```

This mirrors TKV's `TkvDisplayMode`/`formatTkvEntry` in shape, but stays a
separate, CKV-specific pair of functions rather than a shared one, for the
same reason TKV's design gives for not merging with SGKV's version: the
shapes are structurally similar but operate on different domain types
(`CalibrationKey` vs. `Key`/`GraphKey`), so merging would need an adapter
layer that buys nothing.

`key-value` mode is CKV's existing, only-ever format today — hardcoded in
`configuredItems`' current label computation. `value-only` mode is new:
value names only, `+`-joined, no brackets. `alias` renders identically to
`values` (CKV has no separate alias representation), so
`resolveCkvDisplayMode` collapses both to `'value-only'`.

`widgets/key-configurator-panel/ui/key-configurator-panel.tsx`'s existing
`displayMode` computation for SGKV gains a second, parallel computation —
`const ckvDisplayMode = resolveCkvDisplayMode(preferences.usecases.namePreference)`
— passed down to `CalibrationKeysConfigPanel` alongside TKV's own
`tkvDisplayMode`.

The shared `ConfigSummaryView` component's row-label computation for CKV
entries is replaced with `formatCkvEntry(entry.keyValuePairs, displayMode)`.
Changing the preference re-renders already-loaded `configuredCkvs` with the
new format; no data is re-fetched.

#### Copy Configured CKV to Clipboard (Requirement 27)

A copy icon is added at the right end of each configured CKV row (existing
Edit/Delete icons stay on the left, unchanged), copying
`formatCkvEntry(entry.keyValuePairs, displayMode)` — the entry's
currently-displayed formatted text — to the clipboard. Clipboard write
failures are logged via `~shared/lib/logger`, not surfaced to the user, per
requirement 27's note. Same interaction as TKV's row-level copy; no shared
component between the two, same reasoning as Display Format above.

#### Bidirectional Search Box (Requirement 30)

The box's text is always the concatenation of two parts: the formatted,
already-confirmed selection (via `formatCkvEntry`, across all currently
selected keys), and — only while the user is mid-keystroke on a new
fragment — a trailing unconfirmed query fragment, separated by `+` in
`value-only` mode or a space in `key-value` mode. This is the same
dual-purpose role TKV's and SGKV's search boxes play, so `searchTerm`
changes from a pure one-way filter into a two-way field with two writers:
keystrokes and table/suggestion clicks.

Two directions call `resolveCkvSearchInput`/`formatCkvEntry`:

- **Selection → box.** After any `toggleValueSelection`/`toggleKeySelection`
  call, the panel recomputes `formatCkvEntry(selectedPairs, displayMode)`
  and sets `searchTerm` to it directly.
- **Box → selection.** On every keystroke, the panel calls
  `resolveCkvSearchInput`. If the text still starts with the current
  confirmed-selection prefix, only the trailing fragment changed — treat it
  as the live query and leave selection untouched. If it no longer starts
  with that prefix, re-derive the confirmed pairs by splitting on the
  mode's separator and matching each token to a known `{key, value}` pair
  across *all* available keys (not one locked group, unlike TKV),
  deselecting anything that no longer matches. A `value-only` token
  matching more than one key's value resolves to the lowest key `id` and
  returns `kind: 'ambiguous'` with a diagnostic hint, same as SGKV's
  `value-only-auto-resolved`.

Because the box echoes the current selection, it is never genuinely empty
once a value is picked, even though requirement 4 hides it until Add/Edit
is clicked. Requirement 4 still governs visibility, not content.

### Highlight CKV Row While Editing (Requirement 31)

Tracked with the same single-piece-of-state approach as TKV's Add/Edit
mutual exclusion (see below): the row whose inline Edit is currently open
gets a highlight class, driven directly by `ActiveCkvOperation` — no new
state needed. Because `ConfigSummaryView` is shared with the Subsystem
config panel, the highlight class is applied conditionally based on a prop
only the CKV panel passes, so the Subsystem panel's rendering is unaffected.

### Add/Edit Mutual Exclusion (Requirements 24, 25)

Requirements 24 and 25 require that Add and Edit can never both be active
at once, and that starting either one locks out the other's controls until
Apply or Cancel. Tracked with a single piece of panel-local state, the same
approach as TKV's `ActiveTkvOperation`, adapted since CKV has no tag-group
concept — edit is identified by the row's index in the flat
`ConfiguredCkv[]` list instead of a tag group:

```typescript
type ActiveCkvOperation = {type: 'add'} | {index: number; type: 'edit'} | null;
```

- `null` — steady state. Add is enabled; every entry's Edit/Delete is
  enabled.
- `{type: 'add'}` — Add's inline selection (available keys, search, PID
  section) is open. The Add button itself is disabled; every existing
  entry's Edit and Delete buttons are disabled (requirement 25).
- `{type: 'edit', index}` — a specific entry's inline selection is open,
  pre-populated per requirement 6. The Add button is disabled (requirement
  24); Edit/Delete on every _other_ entry is disabled; the entry being
  edited keeps its own Edit button actionable only insofar as it toggles
  that same inline selection closed (equivalent to Cancel).

The panel's existing Apply/Cancel handlers for the inline selection are
extended to also reset this state to `null`, which re-enables every other
button. No new prop is needed: it is derived state the panel already needs
to know which inline selection (if any) is open, now also consulted to
compute each button's `disabled` state and (per requirement 31) which row
gets the highlight class.

**`features/key-configurator/module-configurator-view/ui/module-configuration-panel.tsx`**
— becomes a thin pass-through, forwarding the new CKV props alongside the
existing, untouched module-tag-key props. No store access of its own.

**`widgets/key-configurator-panel/ui/key-configurator-panel.tsx`** — the
`MODULE` branch of `renderKeyConfigView` reads `KeyConfigSlice`,
`CalibrationKeyConfigSlice`, and `ModuleTagKeyConfigSlice` state via
`useGraphDesignerStoreShallow`, resolving the selected item's real
`systemId` as `instanceSystemId` (same fix TKV's design already specifies).

## Back-End (API + Database Design)

No new backend endpoints are built for reading CKV data — module selection
no longer calls a dedicated tuning-config endpoint at all, since CKV data
comes from Graph Data (already loaded by the existing graph-load flow) and
module parameter definitions come from the already-loaded, per-tab module
list. Database design is unaffected; no new persisted schema is introduced
at this layer. The save-endpoint contract for pushing configured CKVs
beyond Graph Data to the backend remains an open question (see below) —
the same open question TKV's design has, which may share a single
resolution across both features.

## Interfaces-Services

The entity layer (`entities/key-configurator`) gains two pure functions, no
fetch or store access:

- `transformCkvsToConfiguredCkvs(ckvs: CkvDto[]): ConfiguredCkv[]` — turns
  `ModuleInstance.ckvs` into the panel's `ConfiguredCkv[]` shape, carrying
  `systemId` through from `CkvDto.systemId` (see CKV Identity above) and
  `pidConfig` through from `CkvDto.supportedParameters`.
- `transformConfiguredCkvsToCkvs(ckvs, keyDefinitionsByNaturalId): CkvDto[]`
  — the reverse, called before writing back to Graph Data. Resolves each
  `ConfiguredCkv`'s key/value `id`s back to `KeyInfo.systemId`/
  `ValueInfo.systemId` against the loaded `availableCalibrationKeys`
  definitions, the same way TKV's `transformConfiguredTkvsToTags` resolves
  its own key/value identities.

Both functions take `CkvDto` from `entities/spf-module-data` — the type
`graph-data-slice.ts` already uses for `ModuleInstance.ckvs` — not the
separate, incompatible `CkvDto`/`TagInfoDto`/`TkvDto` set defined in
`entities/key-configurator/model/module-instance-config.dto.ts`. That file
exists only for the fetch-based `ModuleInstanceTuningConfigDto` flow this
design retires (see Closing the Store-Wiring Gap); it becomes dead code
once `module-instance-coordinator.ts` is deleted, and is deleted alongside
it rather than kept as a second, divergent type family.

The PID-checklist baseline (the zero-config all-PIDs-checked rule from
Requirement 3, above) is a separate selector in
`features/graph-designer/model/calibration-key-config-slice.ts`, not an
entity-layer transform — it needs both `graphData` and
`moduleDefinitionsBySystemId`, which only the store has.

## Error Handling

`CalibrationKeyConfigSlice`'s `initializeCalibrationKeyConfiguration`
returns a boolean, leaving `availableCalibrationKeys` empty rather than
partially populated on failure, and logs via `~shared/lib/logger`. It does
not know about `keyConfigStatus` — that stays owned by `KeyConfigSlice`'s
`initializeConfiguration`, which awaits both the TKV and CKV booleans and
sets `keyConfigStatus` to `'error'` if either fails, `'ready'` only if both
succeed. Apply-time input validation (duplicate-entry check, requirement
10) and delete confirmations stay entirely inside the presentational
panel's existing logic — unchanged. The CKV mutation actions are
synchronous, non-failing map mutations with no error path of their own.

## Security Considerations

No new user input surface or endpoint is introduced. Per-tab and
per-instance state scoping (requirements 16 and 17) also acts as a
data-isolation boundary, preventing one project's or one instance's
configured CKVs from leaking into another's state.

## Performance/Scalability Considerations

- Requirements 19 and 20 are satisfied structurally: module selection reads
  already-loaded Graph Data and module-definition state synchronously,
  rather than issuing a network request, so there is no fetch for a second
  selection to duplicate.
- `selectConfiguredCkvs` reads `graphData.moduleInstances[instanceSystemId]`
  via direct map lookup, replacing today's linear scan over
  `calibration-keys-store.ts`'s per-module instance array.
- Key definitions are cached in slice state after their first fetch per
  project tab, avoiding redundant network calls on repeated module
  selections within the same tab.
- CKV's project-wide (non-locked) search/suggestion candidate space is
  larger than TKV's single-group-bounded one, matching SGKV's existing
  search scope. SGKV's search already performs acceptably at today's
  project sizes, so no new performance risk is introduced beyond what SGKV
  already carries.

## Testing Strategy

### Unit Test Cases

Existing cases from `calibration-keys-config-panel.test.tsx` carry over
against the new `CalibrationKeyConfigSlice`-based implementation, plus new
cases covering this design's additions:

1. `ShowCKVPanelOnModuleSelection` — validates the CKV panel is shown when
   a module is selected.
2. `ResetCKVPanelOnModuleClear` — validates the CKV panel resets when
   module selection is cleared.
3. `DisplayConfiguredCKVs` — validates configured calibration keys are
   displayed as a flat list.
4. `DefaultsAllPidsCheckedOnZeroConfig` — validates the PID-checklist
   baseline selector defaults every PID to `checked: true` when the
   instance has no `ckvs` entry on Graph Data (requirement 3), vs. deriving
   `checked` from `supportedParameters` when CKVs already exist.
5. `HideAvailableKeysByDefault` — validates the available-keys panel is
   hidden by default.
6. `HideSearchByDefault` — validates the search input is hidden by
   default.
7. `AddFlowShowsAvailableKeys` — validates the add flow displays the
   available-keys panel, search, and PID section.
8. `SearchFiltersKeysAndValues` — validates search filters keys and
   values.
9. `ExpandAllKeys` / `CollapseAllKeys` — validates Expand All/Collapse All.
10. `SortByIdAscAndDesc` / `SortByNameAscAndDesc` — validates keys sort by
    ID/Name ascending and descending (requirement 15).
11. `SelectAllValuesGlobalSearchAware` — validates the global Select All
    checkbox selects only filtered/visible values when a search is active
    (requirement 11).
12. `SelectAllValuesUnderKey` — validates the per-key Select All checkbox
    selects all values under that key only (requirement 12).
13. `AllowsSelectingMultipleKeysForCartesianProduct` — validates selecting
    values across multiple keys and that Apply expands every combination
    into its own flat entry (requirement 8).
14. `EditFlowPrepopulatesSelection` — validates the edit flow pre-populates
    configured keys and PIDs.
15. `DeleteCKVConfiguration` — validates an entry can be deleted, with
    confirmation.
16. `ApplySavesConfiguredCKVs` — validates Apply saves selected keys/PIDs
    to configuration.
17. `CancelDiscardsChanges` — validates Cancel discards in-flight changes.
18. `RejectsDuplicateCkvOnApply` — validates Apply rejects an exact
    key/value combination duplicate (order-independent), and that editing
    an entry excludes that entry from its own duplicate comparison
    (requirement 10).
19. `DisablesAddDuringEdit` — validates the Add button disables while an
    edit is in progress (requirement 24).
20. `DisablesEditDeleteDuringAdd` — validates Edit/Delete on existing
    entries disable while an addition is in progress (requirement 25).
21. `PreservesStateAcrossTabSwitch` — validates in-progress Add/Edit
    `useState` (search text, selections, editing index) survives switching
    to the Module Tag Keys tab and back, since `CalibrationKeysConfigPanel`
    is never unmounted (requirement 26).
22. `AmbiguousValueNameResolvesToLowestKeyId` — validates the SGKV-style
    resolver's disambiguation when a bare value name typed in the search
    box matches more than one calibration key.
23. `CopyFormatsEntryPerDisplayMode` — validates the row-level copy
    affordance copies `formatCkvEntry` output matching the active display
    mode (requirements 27, 28).
24. `HighlightsRowBeingEdited` — validates the row under active edit gets
    the highlight class, and that `ConfigSummaryView`'s Subsystem-panel
    usage is unaffected (requirement 31).
25. `LoadsConfiguredCkvsFromGraphData` — validates `selectConfiguredCkvs`
    reads directly from `ModuleInstance.ckvs`, with no network request
    issued.
26. `ApplyWritesBackToGraphData` — validates Apply calls
    `updateModuleCkvsLocal` with the correct `CkvDto[]` and marks Graph
    Data dirty.

## Open-Source Libraries

None introduced. This design continues using the existing stack (Zustand
v5, React, QUI, lucide-react).

## Questions

1. **Backend save contract for CKV** (carried from requirements.md, still
   unresolved). Saving configured CKVs needs to persist to the backend,
   but no endpoint exists yet for CKV list-management. Whether this should
   be a single bulk endpoint or a per-module/per-instance endpoint
   determines the shape of `saveConfiguration`'s real implementation.
   `saveConfiguration` is structured so either contract can be slotted in
   without a rewrite of the surrounding slice, but the actual HTTP call
   remains a stub until this is resolved. Mirrors TKV's identical open
   question and may share a single resolution across both features.
2. **New-entry `systemId` shape** (carried from requirements.md). The
   composite-key stand-in proposed for new CKV entries (see CKV Identity
   above) is not a confirmed backend contract. This needs sign-off before
   implementation, and may share a single resolution with TKV's identical
   question.
3. **Definitions refresh during an active session.** `availableCalibrationKeys`
   is fetched once per project tab and cached for the tab's lifetime.
   If a future feature lets a user import new/updated key definitions
   mid-session, this slice has no way to learn about it on its own. The
   proposed resolution, deferred until such a feature exists: the
   import action calls `resetCalibrationKeyConfiguration()` (and TKV's
   equivalent) directly after a successful import, which clears
   `availableCalibrationKeys`; the next `initializeCalibrationKeyConfiguration`
   call then re-fetches, since its already-loaded guard sees an empty
   cache. This is out of scope for the current migration — no
   import-definitions feature exists today.

## Not Doing

- Module Tag Keys (TKV), subgraph key vectors (SGKV), and subsystem key
  panels are not modified by this design beyond the shared
  `KeyConfigSlice`/widget-wiring changes this design's own "Closing the
  Store-Wiring Gap" section specifies — TKV's design cites back to that
  section rather than respecifying it, and this design only adds CKV's
  slice and panel-side changes on top of that shared foundation.
- Building the actual backend endpoint(s) for CKV persistence is not
  decided or built here — see the Open Questions above.
- Lifting SGKV's `findDistinctKeyAssignment` backtracking logic into a
  shared location is assumed but not designed in detail here — the exact
  shared module location is an implementation detail for the writing-plans
  phase, not a design decision requiring its own section.
