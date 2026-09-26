# Module Tag Keys (TKV) — Design

Requirements: [requirements.md](requirements.md)

## User Interaction and Design

The Module Tag Keys view configures tag key vectors for a module instance.
Clicking a module instance in the graph renders this view inside the Key
Configurator Panel, showing that instance's configured TKVs and letting the
user add, edit, or delete configurations for it.

Whether the user can modify anything is governed by editability, not by
this view itself: in Offline mode, editing is only permitted when graph
edit mode is enabled; in RTC mode the panel is always read-only. In
read-only mode, the view is display-only — configured TKVs are visible but
add/edit/delete are unavailable. In edit mode, the user has full add,
edit, and delete access.

### Design Layout:

```
+------------------------------------------------------------------+
| Module Tag Keys                                          [+ Add] |
+------------------------------------------------------------------+

▼ Configured TKVs
--------------------------------------------------------------------

▼ Tag 1                                                  [Delete]

   [Edit] [Delete]  [mod_key_1: tag_1_1] [mod_key_4: tag_4_2]

   [Edit] [Delete]  [mod_key_1: tag_1_3]


▶ Tag 2                                                  [Delete]



▼ Configure PID's for TKVs
--------------------------------------------------------------------

+--------------+------------+-------------------------+
| Support TKV  | PID        | Name                    |
+--------------+------------+-------------------------+
| [ ]          | 0x8001020  | PARAM_ID_MODULE_TAG_1   |
| [ ]          | 0x8001021  | PARAM_ID_MODULE_TAG_2   |
| [ ]          | 0x8001022  | PARAM_ID_MODULE_TAG_3   |
| [ ]          | 0x8001023  | PARAM_ID_MODULE_TAG_4   |
| [ ]          | 0x8001024  | PARAM_ID_MODULE_TAG_5   |
+--------------+------------+-------------------------+


Search: [_____________________________________________]

+--------------------------------------------------------------+
| Tag ID                    | Tag                              |
+--------------------------------------------------------------+

▼ ○ Tag1                  | Tag 1

    ▼ □ MOD001            | mod_key_1

        □ TAG001          | tag_1_1
        □ TAG002          | tag_1_2
        □ TAG003          | tag_1_3

    ▼ □ MOD004            | mod_key_4

        □ TAG010          | tag_4_1
        □ TAG011          | tag_4_2
        □ TAG012          | tag_4_3

---------------------------------------------------------------

▶ ○ Tag2                  | Tag 2

▶ ○ Tag3                  | Tag 3

+--------------------------------------------------------------+

                    [ Apply ]   [ Cancel ]
```

## Component Design

Four layers participate, respecting Feature-Sliced Design boundaries (no
feature imports another feature directly):

- **`features/graph-designer`** owns the TKV state: a new `ModuleTagKeyConfigSlice`
  holds configured TKVs, available tag groups, and per-module parameter
  lists, scoped to the project tab that owns the `GraphDesignerStore`
  instance. The existing `KeyConfigSlice` keeps its role as the thin,
  entity-type-dispatching orchestrator (`initializeConfiguration`,
  `resetConfiguration`, `saveConfiguration`, `isEditable`,
  `keyConfigStatus`) that the widget actually calls; its module branch reads
  and writes `ModuleTagKeyConfigSlice` via `get()`, the same cross-slice-access
  pattern `ModuleDataSlice` already uses today to reach `GraphDataSlice`,
  `ModuleListSlice`, and `SubgraphHeaderSelectionSlice`.
- **`entities/key-configurator`** and **`entities/module-definitions`** own
  the data-fetching and pure transform functions both the TKV slice logic and
  the parallel calibration-key data path call into. Pure functions and API
  clients live here specifically so both consuming features can reach them
  without importing each other.
- **`shared/types`** owns the UI-facing type definitions (`TagGroup`,
  `TkvParameter`, `ConfiguredTkv`) that both `ModuleTagKeyConfigSlice` (in
  `graph-designer`) and the panel (in `key-configurator`) need to agree on.
- **`widgets/key-configurator-panel`** is the bridge. It is the only layer
  with legitimate access to both the `key-configurator` feature (for
  configuration-item selection, unchanged by this work) and the
  `graph-designer` feature (for `KeyConfigSlice`/`ModuleTagKeyConfigSlice`). It
  resolves which module instance is selected, reads that instance's slice
  data, and passes it down as props.

The TKV panel component itself becomes purely presentational — no store
access — which is what makes the FSD boundary work: it no longer needs to
reach into another feature's state, because it no longer reaches into any
state at all.

### Why a Separate Slice

`KeyConfigSlice` as it stands today is a flat interface bundling CKV,
TKV, SGKV, and subsystem state together — the only domain in
`GraphDesignerStore` organized this way. Every other composed concern
(`ModuleDataSlice`, `SubgraphListSlice`, `ModuleListSlice`, `SubsystemSlice`,
`GraphDataSlice`, `VisualizerSlice`, ...) is its own file with its own
interface and creator function, composed into `GraphDesignerStore` via a
type intersection and spread into the store creator. Migrating TKV onto a
new `ModuleTagKeyConfigSlice` file follows that established pattern instead of
extending the flat-interface exception, and leaves CKV/SGKV/subsystem free
to migrate onto their own slice files the same way in later work, rather
than growing `KeyConfigSlice` a third and fourth time.

`ModuleTagKeyConfigSlice` is not referenced as a field or property anywhere —
there is no `moduleTagKeyConfigSlice: ModuleTagKeyConfigSlice` member on `KeyConfigSlice`
or on `GraphDesignerStore`. The two interfaces are composed side by side —
`GraphDesignerStore` is typed as `KeyConfigSlice & ModuleTagKeyConfigSlice & ...`,
and `graph-designer-store.ts`'s creator spreads both:
`...createKeyConfigSlice(set, get), ...createModuleTagKeyConfigSlice(set, get)` —
the same flat composition every other slice pair already uses. Cross-slice
access happens only through `get()`, typed against the full composed store,
exactly as `ModuleDataSlice`'s creator today calls `get().graphData` and
`get().moduleDefinitionsBySystemId`, both of which live on other slices.

### Front-End Interfaces

**`features/graph-designer/model/module-tag-key-config-slice.ts`** (new file) —
owns all TKV-specific state and actions, moved out of `KeyConfigSlice`:

```
interface ModuleTagKeyConfigSlice {
  moduleTagKeys: Record<string, TagGroup>;             // definitions, fetched once per tab
  moduleTagKeyConfiguration: ModuleTagKeyConfiguration; // configuration, single source of truth

  initializeModuleTagKeyConfiguration: (
    context: ModuleTagKeyConfigurationContext,
  ) => Promise<boolean>;
  resetModuleTagKeyConfiguration: () => void;

  addConfiguredTkv: (instanceSystemId: string, tkv: ConfiguredTkv) => void;
  removeConfiguredTkv: (instanceSystemId: string, index: number) => void;
  updateConfiguredTkvs: (instanceSystemId: string, tkvs: ConfiguredTkv[]) => void;
}

interface ModuleTagKeyConfiguration {
  configuredTkvsByInstance: Record<string, ConfiguredTkv[]>;    // keyed by instance systemId
  tkvParametersByInstance: Record<string, TkvParameter[]>;      // keyed by instance systemId
}

type ModuleTagKeyConfigurationContext = {
  instanceSystemId: string;
  moduleDefinitionSystemId: string;
  moduleId: number;
  projectId: string;
};
```

`moduleTagKeys` keeps its existing name and purpose — tag key _definitions_,
grouped by tag — but its type changes from today's flat placeholder to the
`TagGroup`-shaped structure the panel actually needs, mirroring the existing
`transformTagDefinitionsToTagGroups` output. It is the only TKV-related
field that stays a pure, read-only, tab-scoped definition — fetched at most
once and never mutated by add/edit/delete/apply.

`moduleTagKeyConfiguration` is plain state — not a slice or store of its
own — bundling both `configuredTkvsByInstance` (the configured entries per
instance) and `tkvParametersByInstance` (the parameter list used while
configuring a tag's PIDs, keyed by the same instance `systemId` as
`configuredTkvsByInstance` rather than by module-type id). The three
mutation actions (`addConfiguredTkv`, `removeConfiguredTkv`,
`updateConfiguredTkvs`) live on `ModuleTagKeyConfigSlice` and are the only code
that mutates it — no setter lives on `ModuleTagKeyConfiguration` itself.
`configuredTkvsByInstance` itself replaces today's flat, unscoped
placeholder with a direct per-instance map — one lookup, no nested
module→instance structure, no linear scan (requirement 16). Scoping this
state on the per-tab `GraphDesignerStore` also satisfies requirement 15.

`initializeModuleTagKeyConfiguration(context)` checks `get()` for
already-loaded data for `instanceSystemId` and skips the fetch if present;
otherwise it fetches `moduleTagKeys` (if not already loaded this tab) and
calls the shared fetch helper (below) for the module definition and tuning
config, transforms the results, and populates
`moduleTagKeyConfiguration.configuredTkvsByInstance` and
`moduleTagKeyConfiguration.tkvParametersByInstance`, both keyed by
`instanceSystemId`. Because this fetch-and-populate logic lives entirely
inside `ModuleTagKeyConfigSlice`, with no dependency on fetch/distribution logic
outside it, this satisfies requirement 19.

`addConfiguredTkv`/`removeConfiguredTkv`/`updateConfiguredTkvs` replace the
old moduleId+instanceId-keyed store actions
(`addConfiguredTagKeyValue`/`removeConfiguredTagKeyValue`/
`updateConfiguredTagKeyValues`), each updating
`moduleTagKeyConfiguration.configuredTkvsByInstance[instanceSystemId]`
directly via the slice's own `set`.

`resetModuleTagKeyConfiguration()` clears `moduleTagKeys` and
`moduleTagKeyConfiguration`.

**`features/graph-designer/model/key-config-slice.ts`** — keeps its
existing shape (`calibrationKeys`, `isEditable`, `keyConfigStatus`,
`subgraphConfig`, `subsystemConfig`, `initializeConfiguration`,
`resetConfiguration`, `saveConfiguration`, `setIsEditable`), unchanged by
this design except for its module branch. `initializeConfiguration`'s
existing discriminated-union context type gains an `instanceSystemId` field
so its module branch can call
`get().initializeModuleTagKeyConfiguration(...)`; `resetConfiguration`
likewise calls `get().resetModuleTagKeyConfiguration()`.
`saveConfiguration` is structured to send
`get().moduleTagKeyConfiguration.configuredTkvsByInstance` (requirement 21)
but its backend call stays a stub pending the Open Question below. The
`subgraph`/`subsystem` branches of all three are unchanged from today's
placeholder behavior — untouched, out of scope.

Today, `createKeyConfigSlice` takes only `set` (typed against `KeyConfigSlice`
alone) and has no way to reach another slice's state. To call across to
`ModuleTagKeyConfigSlice`, its creator function becomes generic over the full
composed store type `S`, the same way `createModuleDataSlice` already is:

```typescript
export function createKeyConfigSlice<
  S extends KeyConfigSlice & ModuleTagKeyConfigSlice,
>(
  set: StoreApi<S>['setState'],
  get: StoreApi<S>['getState'],
): KeyConfigSlice {
  return {
    calibrationKeys: [],
    isEditable: false,
    keyConfigStatus: 'uninitialized',
    subgraphConfig: null,
    subsystemConfig: null,

    initializeConfiguration: async (context) => {
      if (context.itemType === 'module') {
        const success = await get().initializeModuleTagKeyConfiguration({
          instanceSystemId: context.instanceSystemId,
          moduleDefinitionSystemId: context.moduleDefinitionSystemId,
          moduleId: context.moduleId,
          projectId: context.projectId,
        });
        set({keyConfigStatus: success ? 'ready' : 'error'} as Partial<S>);
        return success;
      }
      // subgraph/subsystem branches: unchanged placeholder behavior
      ...
    },

    resetConfiguration: () => {
      get().resetModuleTagKeyConfiguration();
      set({
        calibrationKeys: [],
        isEditable: false,
        keyConfigStatus: 'uninitialized',
        subgraphConfig: null,
        subsystemConfig: null,
      } as Partial<S>);
    },

    saveConfiguration: async () => {
      const {configuredTkvsByInstance} = get().moduleTagKeyConfiguration;
      // stub backend call — contract pending the Open Question below
      return true;
    },

    setIsEditable: (editable) => set({isEditable: editable} as Partial<S>),
  };
}
```

`KeyConfigSlice`'s own field set is unchanged — it never held TKV state, so
nothing is removed from it. Only its creator function's signature changes,
to become generic over `S` so `get()` can see `ModuleTagKeyConfigSlice`'s
state and actions. `set()`'s casts to `Partial<S>` follow the same pattern
`createModuleDataSlice` already uses for the same reason.

**`features/graph-designer/model/graph-designer-store.ts`** — the
`GraphDesignerStore` type intersection and its creator function each gain
`ModuleTagKeyConfigSlice`/`createModuleTagKeyConfigSlice(set, get)`, alongside the
existing `KeyConfigSlice` entry, following the same composition pattern
already used for every other slice pair. `KeyConfigSlice` is not removed —
it keeps its entry in both the type intersection and the creator spread; only
the call itself changes, since it can now take `set`/`get` directly instead of
the cast-wrapping lambda it needs today:

```diff
   import {createKeyConfigSlice, type KeyConfigSlice} from './key-config-slice';
   import {createModuleDataSlice, type ModuleDataSlice} from './module-data-slice';
   import {createModuleListSlice, type ModuleListSlice} from './module-list-slice';
+  import {
+    createModuleTagKeyConfigSlice,
+    type ModuleTagKeyConfigSlice,
+  } from './module-tag-key-config-slice';
```

```diff
     SubsystemOperations &
     KeyConfigSlice &
+    ModuleTagKeyConfigSlice &
     ValidationResultSlice &
```

```diff
-    ...createKeyConfigSlice((partial) =>
-      set(partial as Partial<GraphDesignerStore>),
-    ),
+    ...createKeyConfigSlice(set, get),
+    ...createModuleTagKeyConfigSlice(set, get),
     ...createValidationResultSlice(set, get),
```

No other line in `graph-designer-store.ts` changes. Every other slice's entry
in the type intersection and creator spread is untouched.

**`features/graph-designer/hooks/use-key-configurator.ts`** — the existing
public selector hook is extended to expose `ModuleTagKeyConfigSlice`'s fields and
actions alongside `KeyConfigSlice`'s. This remains the sanctioned entry
point for reading either slice from outside `features/graph-designer`.

**`shared/types/key-configurator-config.types.ts`** — gains `TagGroup`,
`TkvParameter`, and `ConfiguredTkv`, moved here from their current
feature-local location, alongside the `Key`/`GraphKey`/`KeyValue` types they
already compose with.

**`entities/key-configurator`** — gains the pure DTO-to-UI transform
functions (tag/tuning-config → `ConfiguredTkv`/`TagGroup`/`TkvParameter`)
currently defined inside the `key-configurator` feature, so both
`KeyConfigSlice` and the presentational panel can call them without a
feature-to-feature import.

**`features/key-configurator/module-configurator-view/ui/module-tag-keys/module-tag-keys-config-panel.tsx`**
— becomes purely presentational. It takes `moduleTagKeys`,
`configuredTkvs` (the resolved array for the current instance, read from
`moduleTagKeyConfiguration.configuredTkvsByInstance`), `parameters` (read
from `moduleTagKeyConfiguration.tkvParametersByInstance`), `isEditable`, and
`onAdd`/`onRemove`/`onUpdate` callbacks as props. All internal UI state
(search, expand/collapse, in-progress selection, Cartesian-product
generation on Apply, duplicate detection) is unchanged.

**`features/key-configurator/module-configurator-view/ui/module-configuration-panel.tsx`**
— becomes a thin pass-through, forwarding the new TKV props alongside its
existing, untouched calibration-key props.

**`widgets/key-configurator-panel/ui/key-configurator-panel.tsx`** — reads
`KeyConfigSlice` and `ModuleTagKeyConfigSlice` via the extended
`useKeyConfigurator()` selector, resolves the selected module instance's
data, and passes it to the panel chain. The existing
`instanceId={(item as any).instanceId || 1}` placeholder is replaced with
the item's real `systemId`, and the widget's mapping from a selected item to
a configuration context is extended to include the fields the module branch
needs (`moduleDefinitionSystemId`, `instanceSystemId`, `moduleId`).

### Back-End (API + Database Design)

No new backend endpoints are built in this design — the module-definition
and tuning-config read endpoints used today are unchanged. Database design
is unaffected; no new persisted schema is introduced at this layer. The
save-endpoint contract for persisting configured TKVs remains an open
question (see below).

### Interfaces-Services

A new shared function in the entity layer,
`fetchModuleInstanceConfigData(projectId, moduleDefinitionSystemId, instanceSystemId)`,
wraps the module-definition fetch and the tuning-config fetch and returns
both results together. `ModuleTagKeyConfigSlice`'s
`initializeModuleTagKeyConfiguration` calls it. The existing calibration-key
data-fetch path — unrelated in UI/behavior, and unchanged by this design —
is updated only at its two inline API call sites to call this same helper,
so a single module selection triggers one fetch, not two (requirement 20),
without altering calibration-key behavior.

### Error Handling

`ModuleTagKeyConfigSlice`'s `initializeModuleTagKeyConfiguration` returns a
boolean, leaving its TKV fields empty rather than partially populated on
failure, and logs via `~shared/lib/logger`. It does not know about
`keyConfigStatus` — that stays owned by `KeyConfigSlice`'s
`initializeConfiguration`, which awaits the boolean and sets
`keyConfigStatus` to `'error'` or `'ready'` itself (reusing the existing
`SliceStatus` pattern), the same way it already handles its
`subgraph`/`subsystem` branches. Apply-time input validation stays entirely
inside the presentational panel's existing logic — unchanged. Delete
confirmations (tag-level and entry-level) also stay in the panel; the new
`ModuleTagKeyConfigSlice` mutation actions are synchronous, non-failing map
mutations with no error path of their own.

## Security Considerations

No new user input surface or endpoint is introduced. Per-tab and
per-instance state scoping (required by requirements 15 and 16) also acts as
a data-isolation boundary, preventing one project's or one instance's
configured TKVs from leaking into another's state.

## Performance/Scalability Considerations

- Requirement 20 is satisfied structurally: the shared fetch helper is the
  only path to the module-definition/tuning-config endpoints, so a single
  module selection cannot trigger two fetches.
- `moduleTagKeyConfiguration.configuredTkvsByInstance[instanceSystemId]` is a
  direct map lookup, replacing today's linear scan over a per-module
  instance array.
- Tag-group and parameter definitions are cached in slice state after their
  first fetch per project tab, avoiding redundant network calls on repeated
  module selections within the same tab.

## Testing Strategy

### Unit Test Cases

Each TKV configuration stores its own specific PID configuration
(`moduleTagKeyConfiguration.tkvParametersByInstance`, keyed per instance —
see Front-End Interfaces above). The following test cases carry over from
the existing test suite and continue to apply against the migrated
`KeyConfigSlice`-based implementation:

1. `ShowTKVPanelOnModuleSelection` — validates the TKV panel is shown when a
   module is selected.
2. `ResetTKVPanelOnModuleClear` — validates the TKV panel resets when module
   selection is cleared.
3. `DisplayConfiguredTKVs` — validates configured tag keys are displayed.
4. `GroupConfigurationsByTag` — validates configurations are grouped by tag.
5. `ShowConfiguredPIDsOnTagKeysSelection` — validates specific PID
   configuration appears when configured tag keys are selected.
6. `SingleTagConfiguration` — validates the UI supports the single-tag
   configuration scenario.
7. `ShowNoConfigurationExists` — validates the zero state when no TKV
   configuration exists.
8. `HideAvailableTagsByDefault` — validates the available-tags panel is
   hidden by default.
9. `HideSearchByDefault` — validates the search input is hidden by default.
10. `ExpandAvailableTagsShowsSearch` — validates expanding available tags
    reveals the search input.
11. `AddFlowShowsAvailableTags` — validates the add flow displays the
    available-tags panel.
12. `SearchFiltersTagsAndPIDs` — validates search filters tags and PID
    values.
13. `ExpandAllTags` — validates Expand All expands all tag groups.
14. `CollapseAllTags` — validates Collapse All collapses all tag groups.
15. `ShowPIDConfigurePanel` — validates the PID configure panel appears in
    the add flow.
16. `EditFlowPrepopulatesSelection` — validates the edit flow pre-populates
    configured tags and PIDs.
17. `EditFlowAllowsDeselectConfigured` — validates previously configured
    tags/PIDs can be deselected.
18. `EditFlowSelectionPersistsOnToggle` — validates selection persists
    across expand/collapse.
19. `EditFlowSearchKeepsSelection` — validates search does not clear
    pre-populated selection.
20. `DeleteTagLevelConfiguration` — validates tag-level configuration can be
    deleted.
21. `DeleteTKVConfiguration` — validates an entire TKV configuration can be
    deleted.
22. `DeleteShowsConfirmation` — validates a confirmation dialog appears
    before delete.
23. `DeleteUpdatesZeroState` — validates the UI updates to the zero state
    after delete.
24. `ApplySavesConfiguredTKVs` — validates Apply saves selected tags/PIDs to
    configuration.
25. `CancelDiscardsChanges` — validates Cancel discards in-flight changes.
26. `SelectAllValuesUnderTagKey` — validates Select All selects all values
    under a tag key.
27. `SortByIdAscAndDes` — validates keys sort by ID ascending and
    descending (requirement 22).
28. `SortByNameAscAndDes` — validates keys sort by Name ascending and
    descending (requirement 22).
29. `SearchSpecialCharacters` — validates search handles special
    characters.

## Open-Source Libraries

None introduced. This design continues using the existing stack (Zustand
v5, React, QUI, lucide-react).

## Questions

1. **Backend save contract for TKV** (carried from requirements.md, still
   unresolved). Saving configured TKVs needs to persist to the backend, but
   no endpoint exists yet for TKV list-management. Whether this should be a
   single bulk endpoint or a per-module/per-instance endpoint determines the
   shape of `saveConfiguration`'s real implementation. `saveConfiguration`
   is structured so either contract can be slotted in without a rewrite of
   the surrounding slice, but the actual HTTP call remains a stub until this
   is resolved.

## Not Doing

- Calibration key vectors (CKV), subgraph key vectors (SGKV), and subsystem
  key panels are not modified — their UI and business logic are untouched.
  The calibration-key data-fetch path is touched only at its two API call
  sites, to route through the shared fetch helper.
- The existing configuration-item selection and routing behavior shared
  across all key-configuration sub-panels is not changed.
- Building the actual backend endpoint(s) for TKV persistence is not decided
  or built here — see the Open Question above.
