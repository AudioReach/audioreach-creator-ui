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

   [Edit] [Delete]  tag_1_1+tag_4_2                       [Copy]

   [Edit] [Delete]  tag_1_3                                [Copy]


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


Search: [tag_1_1+_______________________________________]
         ┌─────────────────────────┐
         │ tag_1_2      Key: mod_key_1 │  ← suggestion popup
         │ tag_1_3      Key: mod_key_1 │
         └─────────────────────────┘

+--------------------------------------------------------+-----------------+
| Tag ID                    | Tag                        | [Expand][Collapse] |
+--------------------------------------------------------+-----------------+

▼ ● Tag1                  | Tag 1

    ▼ □ MOD001            | mod_key_1

        ■ TAG001          | tag_1_1
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

The displayed strings above assume the Usecase Name preference is `values`
(requirement 29) and the search box currently echoes one confirmed
selection (`tag_1_1`) plus an in-progress query (`tag_1_2`/`tag_1_3`
candidates) — see Search, Display Format, and Copy below. Under `keyvalues`,
the same rows render as `[mod_key_1: tag_1_1]` instead.

## Component Design

Four layers participate, respecting Feature-Sliced Design boundaries (no
feature imports another feature directly):

- **`features/graph-designer`** — a new `ModuleTagKeyConfigSlice` owns the
  tag key definitions cache and the actions that add, remove, and update
  configured TKVs on Graph Data, scoped per project tab. `KeyConfigSlice`
  stays the thin orchestrator the widget calls, reaching
  `ModuleTagKeyConfigSlice` via `get()` — the same cross-slice pattern
  `ModuleDataSlice` already uses for `GraphDataSlice`/`ModuleListSlice`.
- **`entities/key-configurator`** — pure DTO↔UI transform functions
  (`TagInfoDto[]` ↔ `ConfiguredTkv[]`), no fetch or store access, so
  `graph-designer` can reach them without a feature-to-feature import.
- **`shared/types`** — the `TagGroup`/`TkvParameter`/`ConfiguredTkv` types
  both the slice and the panel need to agree on.
- **`widgets/key-configurator-panel`** — the only layer with legitimate
  access to both `key-configurator` (selection) and `graph-designer` (the
  slices). Resolves the selected module instance and passes its data down
  as props.

The TKV panel itself becomes purely presentational — no store access — so
it no longer needs to reach into another feature's state at all.

### Why a Separate Slice

`KeyConfigSlice` today bundles CKV/TKV/SGKV/subsystem state in one flat
interface — the only domain in `GraphDesignerStore` organized that way;
every other concern (`ModuleDataSlice`, `SubgraphListSlice`,
`ModuleListSlice`, `SubsystemSlice`, `GraphDataSlice`, ...) is its own
file. Migrating TKV onto its own `ModuleTagKeyConfigSlice` follows that
established pattern. CKV follows the same pattern via its own
`CalibrationKeyConfigSlice` (see Calibration Keys' design), composed
alongside TKV's; SGKV and subsystem state stay inside `KeyConfigSlice`,
out of scope for both migrations.

The three slices compose side by side, not nested — `GraphDesignerStore`
is typed as `KeyConfigSlice & ModuleTagKeyConfigSlice &
CalibrationKeyConfigSlice & ...`, and the creator spreads all three:
`...createKeyConfigSlice(set, get), ...createModuleTagKeyConfigSlice(set, get), ...createCalibrationKeyConfigSlice(set, get)`.
Cross-slice access happens only through `get()`, exactly as
`ModuleDataSlice`'s creator already does for other slices.

### Tab-Mounting Fix (Requirement 33)

`ModuleConfigurationPanel` (`features/key-configurator/module-configurator-view/ui/module-configuration-panel.tsx`)
currently wraps each `Tabs.Panel` in an additional
`{activeTab === 'x' && <Tabs.Panel>...}` conditional, which unmounts
`ModuleTagKeysConfigPanel`/`CalibrationKeysConfigPanel` whenever the other
tab is active, destroying `ModuleTagKeysConfigPanel`'s in-progress local
`useState` (`editingTagGroupId`, `selectedKeyValues`, `searchTerm`,
`expandedKeys`, sort order, etc.). This is the same component, and the
same fix, as CKV's design specifies in full (Calibration Keys' design,
"Tab-Mounting Fix"): delete the outer `{activeTab === 'x' && ...}`
conditionals and render both `Tabs.Panel`s unconditionally, relying on
QUI's own `hidden`/`display: none` visibility handling instead of
unmounting. The fix is one change in the shared component, applied once —
not duplicated per tab — and satisfies requirement 33 for TKV the same way
it satisfies CKV's requirement 26.

### Front-End Interfaces

**`features/graph-designer/model/module-tag-key-config-slice.ts`** (new file) —
owns the tag key definitions cache and the actions that persist configured
TKVs to the backend, mirroring the result onto Graph Data once the backend
call succeeds:

```typescript
interface ModuleTagKeyConfigSlice {
  moduleTagKeys: Record<string, TagGroup>; // definitions, fetched once per tab

  initializeModuleTagKeyConfiguration: (projectId: string) => Promise<boolean>;
  resetModuleTagKeyConfiguration: () => void;

  addTkvs: (
    instanceSystemId: string,
    tagGroupId: number,
    valueSystemIdCombinations: string[][],
    parameterSystemIds: string[],
  ) => Promise<boolean>;
  deleteTagGroup: (instanceSystemId: string, tagGroupId: number) => Promise<boolean>;
  deleteTkvs: (
    instanceSystemId: string,
    targets: Array<{tagGroupId: number; tkvSystemId: string}>,
  ) => Promise<boolean>;
  updateTkvParameters: (
    instanceSystemId: string,
    tkvSystemId: string,
    parameterSystemIds: string[],
  ) => Promise<boolean>;
}
```

This supersedes the slice's originally-designed shape
(`addConfiguredTkv`/`removeConfiguredTkv`/`updateConfiguredTkvs`, all
synchronous and Graph-Data-only). The backend now has real tag/TKV
endpoints (see Back-End below), so every mutation action is
`Promise<boolean>`-async: each calls its backend endpoint(s) first and
only writes to Graph Data (via `get().updateModuleTagsLocal`, inline — see
Graph Data Write-Back below) on success. Unlike CKV, TKV has no separate
synchronous local-write action the others funnel through — `addTkvs`,
`deleteTagGroup`, `deleteTkvs`, and `updateTkvParameters` each build their
own next `TagInfoDto[]` and call `updateModuleTagsLocal` directly, because
each one's shape of change (new tag + TKVs, whole tag removal, scattered
TKV removal across tags, one TKV's parameter diff) is different enough
that a shared "take the final list and write it" step wouldn't save
meaningful duplication the way CKV's did.

`addTkvs` also creates the parent tag on demand: if `instanceSystemId`'s
`tags` has no entry for `tagGroupId` yet, it calls `createTags` first,
then proceeds to create TKVs under the newly-created tag's `systemId`.
`deleteTagGroup` removes the entire tag (and all its TKVs) in one call;
`deleteTkvs` removes a scattered batch of individual TKVs, potentially
spanning more than one tag group, grouping the batch by the owning tag's
`systemId` so each tag needs at most one `deleteTkvsApi` call.
`updateTkvParameters` is scoped to a single TKV (unlike CKV's
`updateCkvParametersOnly`, which is module-scoped across every configured
CKV) — it diffs the requested PIDs against that one TKV's current
`supportedParameters` and calls `createTkvParameters`/`deleteTkvParameters`
only for the PIDs that actually changed.

`moduleTagKeys` is tag key _definitions_, grouped by tag — populated once
per tab via `getAllTagDefinitions`/`transformTagDefinitionsToTagGroups`,
unchanged from today, and never mutated by add/edit/delete/apply.
`initializeModuleTagKeyConfiguration(projectId)` returns early if
`moduleTagKeys` is already populated; otherwise it fetches and stores the
result. `resetModuleTagKeyConfiguration()` clears `moduleTagKeys`, so the
next `initializeModuleTagKeyConfiguration` call re-fetches.

A module instance's configured TKVs are not stored on this slice at all —
`selectConfiguredTkvs(state, instanceSystemId)` reads
`graphData.moduleInstances[instanceSystemId]?.tags` directly and
transforms it through `transformTagsToConfiguredTkvs` (Interfaces-Services
below) into `ConfiguredTkv[]`. The panel calls this selector for display,
and each mutation action below calls it to read the current list
immediately before writing an updated one back.

The PID checklist's baseline is derived the same way: a selector merges
`moduleDefinitionsBySystemId[moduleDefinitionSystemId]
.paramDefinitionsSummaryInfo` (every PID the module supports) with the
instance's `tags[...].supportedParameters` (the subset currently checked)
to produce the panel's `TkvParameter[]` baseline, defaulting `checked` to
`false` when no tags are configured yet. The panel seeds its own local
`useState` from this baseline when the Add/Edit PID section opens.
Toggling a checkbox updates only that local state; switching to a
different module instance or clicking Cancel discards it, and only Apply
writes the chosen PIDs back, as part of the entry's `pidConfig`.

`addTkvs`/`deleteTagGroup`/`deleteTkvs`/`updateTkvParameters` replace the
old moduleId+instanceId-keyed actions
(`addConfiguredTagKeyValue`/`removeConfiguredTagKeyValue`/
`updateConfiguredTagKeyValues`), and are the real implementation of what
this design originally specified as synchronous
`addConfiguredTkv`/`removeConfiguredTkv`/`updateConfiguredTkvs`. Each
calls its backend endpoint(s) first (see Back-End below) and only calls
`get().updateModuleTagsLocal(instanceSystemId, tags)` with the derived
next `TagInfoDto[]` once the backend call(s) resolve successfully — not
before (see Error Handling below for the one exception, `deleteTkvs`'s
per-tag-group partial write-back). `addTkvs`:

```typescript
addTkvs: async (instanceSystemId, tagGroupId, valueSystemIdCombinations, parameterSystemIds) => {
  const tags = readTags(instanceSystemId);
  let tag = tags.find((t) => t.naturalId === tagGroupId);
  let mergedTags = tags;

  if (!tag) {
    const tagGroup = Object.values(get().moduleTagKeys).find((g) => g.id === tagGroupId);
    const tagsResult = await createTags(projectId, instanceSystemId, {
      tagDefinitionSystemIds: [tagGroup.systemId],
    });
    // on blocking issue: toast + return false
    tag = tagsResult.data[0];
    mergedTags = [...tags, tag];
  }

  const tkvsResult = await createTkvs(projectId, instanceSystemId, tag.systemId, {
    tkvs: valueSystemIdCombinations.map((valueSystemIds) => ({valueSystemIds})),
  });
  // on blocking issue: toast + return false

  let newTkvs = tkvsResult.data;
  if (parameterSystemIds.length > 0) {
    const paramsResult = await createTkvParameters(projectId, instanceSystemId, {
      updates: newTkvs.map((tkv) => ({parameterSystemIds, tkvSystemId: tkv.systemId})),
    });
    // on blocking issue: toast + return false
    newTkvs = newTkvs.map((tkv) => ({...tkv, supportedParameters: /* resolved from paramsResult */}));
  }

  const finalTags = mergedTags.map((t) =>
    t.naturalId === tagGroupId ? {...t, tkvs: [...(t.tkvs ?? []), ...newTkvs]} : t,
  );
  get().updateModuleTagsLocal(instanceSystemId, finalTags);
  return true;
},
```

If the instance has no tag yet for `tagGroupId`, `addTkvs` creates the
parent tag via `createTags` first, then creates TKVs under the newly
backend-assigned tag `systemId` — a single Apply click on a brand-new tag
group still issues at most two write calls (`createTags`, `createTkvs`),
not per-value calls. `deleteTagGroup` removes an entire tag (and every TKV
under it) in one `deleteTags` call. `deleteTkvs` accepts a batch of
`{tagGroupId, tkvSystemId}` targets that may span more than one tag group,
groups them by the owning tag's `systemId`, and issues one `deleteTkvsApi`
call per distinct tag in the batch. `updateTkvParameters` is scoped to a
single TKV (unlike CKV's `updateCkvParametersOnly`, which re-applies one
PID set across every configured CKV on the module) — it diffs the
requested PIDs against that one TKV's current `supportedParameters` and
calls `createTkvParameters`/`deleteTkvParameters` only for the PIDs that
actually changed, skipping either call entirely when nothing was added or
removed on that side.

### TKV Identity

`ConfiguredTkv` (defined in `shared/types/key-configurator-config.types.ts`)
carries its own identity:

```typescript
export interface ConfiguredTkv {
  keyValuePairs: Array<{key: Key; value: KeyValue}>;
  pidConfig: number[];
  systemId: string; // this TKV entry's own identity
  tagGroup: string;
  tagGroupId: number;
}
```

`systemId` is required once an entry is included in
`selectConfiguredTkvs`'s result, because every entry must round-trip back
into a `TkvDto` on Apply, and `TkvDto.systemId` is non-optional. An entry
loaded from Graph Data copies it directly from the source
`TkvDto.systemId`. `TagInfoDto.systemId` (the
parent tag's identity) is not stored on `ConfiguredTkv` at all — it is
resolved at write-back time by looking up `tagGroupId` (already a
`naturalId`, already present on `ConfiguredTkv`) against the loaded tag
definitions behind `moduleTagKeys`, the same way `KeyInfo.systemId`/
`ValueInfo.systemId` are resolved by looking up each `keyValuePairs[].key.id`/
`.value.id` against the matching key/value definitions. See
Interfaces-Services below for where this lookup happens.

**This is fully resolved — no client-side stand-in exists anywhere in the
TKV codebase.** Every new TKV's `systemId` comes directly from
`createTkvs`'s response (`TkvDto[]`), a real backend-assigned identity,
because TKV has no path that creates a new key/value combination without
going through `addTkvs`. Unlike CKV, TKV's "editing" an existing entry
(`updateTkvParameters`) is PID-only — it can never change which tag group
or which value an existing TKV points to, so there is no multi-key-edit
Cartesian-product expansion that could produce additional rows needing a
synthesized identity. The design's originally-proposed composite-key
stand-in (`TagKeyDefinitionInfo`/`TagValueDefinitionInfo` `systemId`s,
sorted and joined) was never implemented, because it is never needed:
`module-tag-keys-config-panel.tsx` has only `buildTkvId`, a React
list-`key` helper for rendering, not an identity generator — it is never
read by any backend call or by `transformConfiguredTkvsToTags`. This
resolves the design's original open question for TKV in full, unlike
CKV's identical question, which remains partially open for CKV's Edit
path (see CKV's design, CKV Identity).

### Graph Data Write-Back

**`features/graph-designer/model/graph-data-slice.ts`** (extended) — gains
one new action, following the existing local-mutation pattern already used
by `updateModuleAliasLocal`/`updateModuleContainerLocal`/
`updateModulePortCountLocal`:

```typescript
updateModuleTagsLocal: (moduleSystemId: string, tags: TagInfoDto[]): void => {
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
        [moduleSystemId]: {...current, tags},
      },
    },
  } as unknown as Partial<S>);
  get().markDirty();
},
```

`ModuleTagKeyConfigSlice`'s mutation actions call this immediately after
deriving the instance's updated TKV list, so Graph Data and the read-side
selector it feeds (`selectConfiguredTkvs`) change together, in the same
user action, with no intermediate inconsistent render. `markDirty()` is the
same dirty-tracking mechanism every other Graph Data mutation already
triggers.

**`features/graph-designer/model/key-config-slice.ts`** — loses the TKV
state it holds today: the `moduleTagKeys: ModuleTagKey[]` field and the
flat `ModuleTagKey {tagKeyId, tagKeyName, value}` interface are both
removed, superseded by `ModuleTagKeyConfigSlice.moduleTagKeys: Record<string, TagGroup>`
(grouped by tag, each key carrying its full value list — see Front-End
Interfaces above), which is also where `getAllTagDefinitions` is now
called from, instead of inline inside `initializeConfiguration`.
`initializeConfiguration` fans out to both slices unconditionally (not
gated on `context.itemType`, since both caches are cheap to have loaded
regardless of which item type is selected), and `resetConfiguration`
resets both in the same way:

```typescript
initializeConfiguration: async (context) => {
  const [calibrationOk, tagOk] = await Promise.all([
    get().initializeCalibrationKeyConfiguration(context.projectId),
    get().initializeModuleTagKeyConfiguration(context.projectId),
  ]);
  const success = calibrationOk && tagOk;
  set({keyConfigStatus: success ? 'ready' : 'error'} as Partial<S>);
  return success;
},

resetConfiguration: () => {
  get().resetCalibrationKeyConfiguration();
  get().resetModuleTagKeyConfiguration();
  // ...remaining reset of isEditable/keyConfigStatus/subgraphConfig/
  // subsystemConfig: unchanged
},
```

**`saveConfiguration` no longer touches CKV/TKV at all.** It remains a
stub (`// TODO: Replace with actual backend API call`, guarded on
`configContext`/`projectId`, returning `true` without reading or sending
anything) — but its scope has narrowed to subgraph/subsystem config only.
TKV/CKV persistence moved entirely into `ModuleTagKeyConfigSlice`'s and
`CalibrationKeyConfigSlice`'s own per-mutation backend calls above; there
is no longer a separate "save" step for TKV/CKV at all, and the two
features' original shared open question about `saveConfiguration`'s
backend contract no longer applies to TKV/CKV — see Questions below.

**`features/graph-designer/model/graph-designer-store.ts`** — the composed
type becomes `KeyConfigSlice & ModuleTagKeyConfigSlice &
CalibrationKeyConfigSlice & ...`; the creator spreads all three:
`...createKeyConfigSlice(set, get), ...createModuleTagKeyConfigSlice(set, get), ...createCalibrationKeyConfigSlice(set, get)`.
Cross-slice access happens only through `get()`.

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
`configuredTkvs` (the resolved array for the current instance, read via
`selectConfiguredTkvs`), `parameters` (read via the PID-checklist baseline
selector above), `isEditable`, `displayMode` (requirement 29 — see Copy,
Display Format, and Search below), and `onAdd`/`onRemove`/`onUpdate`
callbacks as props. Internal UI state (search, expand/collapse,
in-progress selection, Cartesian-product generation on Apply, duplicate
detection) is unchanged, with two additions — see Add/Edit Mutual
Exclusion and Copy, Display Format, and Search below.

### Copy, Display Format, and Search (Requirements 28–31)

These four requirements were added after an explicit request to study
`features/key-configurator/subgraph-configurator-view/`'s (SGKV) existing
Copy, display-mode, and search/autosuggest implementation and reuse what
transfers. Two pieces transfer directly; the free-text parsing engine does
not, because TKV's selection model is fundamentally different from SGKV's
(table clicks on known objects vs. typing a whole vector from scratch) —
see below for what replaces it.

**New files** —
`features/key-configurator/module-configurator-view/lib/tkv-display-format.ts`
and
`features/key-configurator/module-configurator-view/lib/tkv-search-resolver.ts`.
Neither existed before; `module-configurator-view` previously had no `lib/`
because it had no pure-utility logic — these are its first.

#### Copy (Requirement 28)

`tag-group-summary.tsx`'s per-entry `<li>` gains a third `IconButton`
(lucide `Copy`), placed at the right end of the row (the Design Layout
diagram above shows this), after the Edit/Delete icons which keep their
existing left position. Its `onClick` calls
`navigator.clipboard.writeText(formattedLabel)` wrapped in try/catch with
`logger.error` on failure — the exact pattern already used by SGKV's
`copyVector` in `subgraph-key-vector-config-panel.tsx`. `formattedLabel` is
whatever `formatTkvEntry` (below) already computed for that row — Copy
copies exactly what's on screen, so no new formatting path is introduced
for it.

#### Display Format (Requirement 29)

**`tkv-display-format.ts`** exports:

```typescript
export type TkvDisplayMode = 'key-value' | 'value-only';

export function resolveTkvDisplayMode(
  namePreference: 'alias' | 'keyvalues' | 'values',
): TkvDisplayMode {
  return namePreference === 'keyvalues' ? 'key-value' : 'value-only';
}

export function formatTkvEntry(
  keyValuePairs: Array<{key: Key; value: KeyValue}>,
  displayMode: TkvDisplayMode,
): string {
  if (displayMode === 'value-only') {
    return keyValuePairs.map((pair) => pair.value.name).join('+');
  }
  return keyValuePairs
    .map((pair) => `[${pair.key.name}: ${pair.value.name}]`)
    .join(' ');
}
```

This mirrors SGKV's `KvVectorDisplayMode`/`formatKvVector`
(`subgraph-configurator-view/lib/kv-vector-format.ts`) in shape, but is a
separate, TKV-specific pair of functions rather than a shared one: SGKV's
version formats `KvSelection`/`SubgraphKvPair` (`keyInfo.keyLabel`/
`valueInfo.valueLabel`), while TKV's formats `Key`/`KeyValue`
(`key.name`/`value.name`) — different domain shapes, so merging them would
need an adapter layer that buys nothing, consistent with the project's
"merge only if structurally identical" rule not applying here (the shapes
genuinely differ, not just by a type cast).

`key-value` mode is TKV's existing, only-ever format today —
`[mod_key_1: tag_1_1] [mod_key_4: tag_4_2]`, space-joined. `value-only`
mode is new: value names only, `+`-joined, no brackets —
`tag_1_1+tag_4_2`. `alias` renders identically to `values` (TKV has no
separate alias representation), so `resolveTkvDisplayMode` collapses both
to `'value-only'`.

**`widgets/key-configurator-panel/ui/key-configurator-panel.tsx`** already
computes a `displayMode` for SGKV from
`preferences.usecases.namePreference` (lines 94–97 today). The widget gains
a second, parallel computation —
`const tkvDisplayMode = resolveTkvDisplayMode(preferences.usecases.namePreference)`
— passed to `ModuleConfigurationPanel` (and forwarded to
`ModuleTagKeysConfigPanel`) in the `MODULE` branch of
`renderKeyConfigView`, alongside the existing `instanceId`/`isEditable`/
`moduleId` props. Both computations read the same preference but stay two
separate calls, since SGKV's and TKV's `DisplayMode` types are
independently defined (see above) even though structurally identical today.

`TagGroupSummary` (`module-tag-keys/tag-group-summary.tsx`) takes a new
`displayMode: TkvDisplayMode` prop and replaces its current hardcoded
label computation —

```typescript
label: config.keyValuePairs
  .map((p) => `[${p.key.name}: ${p.value.name}]`)
  .join(' ');
```

— with `formatTkvEntry(config.keyValuePairs, displayMode)`. Changing the
preference re-renders already-loaded `configuredTkvs` with the new format;
no data is re-fetched, since `formatTkvEntry` is a pure display transform
over state that doesn't change.

#### Autosuggestion Search Over Available Tags (Requirement 30)

This applies only to the Available Tags table's search box
(`searchTerm`), not the Configured TKVs list filter (`configSearchTerm`,
which keeps its plain `ArcSearchBar` substring filter, unchanged).

SGKV's free-text bracket/`+` parser
(`subgraph-configurator-view/lib/add-kv-vector-editor.ts`) exists to
reverse-engineer intent from a whole vector typed as one string, including
backtracking (`findDistinctKeyAssignment`) when a bare value name could
belong to more than one key anywhere in the project. TKV has no equivalent
grammar to parse: every selection originates from a table click on a
known `{key, value}` object (`toggleValueSelection`/
`toggleModKeySelection`), so the box's job is to filter and to echo, not
to parse a vector from text.

The generic `KvVectorEditor<T>` control
(`features/key-configurator/ui/kv-vector-editor.tsx`) replaces `ArcSearchBar`
for `searchTerm` specifically (keyboard nav, floating suggestion popup,
mousedown-preventDefault — all reused as-is, no changes to that file).
`configSearchTerm`'s `ArcSearchBar` is untouched.

**`tkv-search-resolver.ts`** exports the suggestion source:

```typescript
export interface TkvSearchSuggestion {
  key: Key;
  value: KeyValue;
}

export function getTkvSearchSuggestions(
  queryText: string,
  availableModuleTagsInfo: Record<string, TagGroup>,
  lockedTagGroupId: number | null,
  displayMode: TkvDisplayMode,
): TkvSearchSuggestion[];
```

Candidate scope follows requirement 10 (single-tag configuration):
while `lockedTagGroupId` is `null` (nothing selected yet), candidates are
every value (and, in `key-value` mode, every key) across every tag group —
the same set `filteredAndSortedTagGroups`' existing substring filter
(lines 142–174) already searches. Once a first value is picked,
`selectedTagGroup` is set (existing behavior in
`toggleValueSelection`/`toggleModKeySelection`) and candidates narrow to
that one tag group's keys/values only — this is what bounds the ambiguity
problem well below SGKV's project-wide scope (see Bidirectional Search Box
below). If `displayMode` is `'value-only'`, only values are matched and
suggested, per requirement 30's note; if `'key-value'`, both keys and
values are matched. Selecting a suggestion calls the same
`toggleValueSelection`/`toggleModKeySelection` a table click already
calls — there is no separate "commit" code path, so a suggestion and a
table click are indistinguishable to the rest of the panel once committed.

#### Bidirectional Search Box (Requirement 31)

The box's text is always the concatenation of two parts: the formatted,
already-confirmed selection (via `formatTkvEntry`), and — only while the
user is mid-keystroke on a new fragment — a trailing unconfirmed query
fragment, separated by `+` in `value-only` mode or a space in `key-value`
mode (matching each mode's own join character). This is the same
dual-purpose role SGKV's `editorText` plays against `candidatePairs`, so
`searchTerm` changes from a pure one-way filter into a two-way field with
two writers: keystrokes and table/suggestion clicks.

**`tkv-search-resolver.ts`** also exports a diagnostic type — scaled down
from SGKV's `kv-vector-editor-diagnostic.ts`, which this structurally
mirrors — and the reconciliation function every `searchTerm` change
(typed or programmatic) runs through:

```typescript
export type TkvSearchDiagnostic = {
  candidateKeyNames: string[];
  code: 'value-auto-resolved-by-key-id';
  severity: 'warning';
  valueName: string;
};

export type ResolvedTkvSearchInput =
  | {kind: 'empty'}
  | {queryText: string; kind: 'query'} // no confirmed selection yet
  | {
      kind: 'selection';
      pairs: Array<{key: Key; value: KeyValue}>;
      queryText: string;
    }
  | {
      diagnostic: TkvSearchDiagnostic;
      kind: 'ambiguous';
      pairs: Array<{key: Key; value: KeyValue}>;
      queryText: string;
    };

export function resolveTkvSearchInput(
  text: string,
  availableModuleTagsInfo: Record<string, TagGroup>,
  lockedTagGroupId: number | null,
  displayMode: TkvDisplayMode,
): ResolvedTkvSearchInput;
```

Two directions call this:

- **Selection → box.** After any `toggleValueSelection`/
  `toggleModKeySelection` call (table click or suggestion commit), the
  panel recomputes `formatTkvEntry(selectedPairs, displayMode)` and sets
  `searchTerm` to it directly — no trailing query, since a confirmed
  click isn't "typing."
- **Box → selection.** On every keystroke, the panel calls
  `resolveTkvSearchInput`. If the text still starts with the current
  confirmed-selection prefix, only the trailing fragment changed — treat
  it as the live query and leave selection untouched. If it no longer
  starts with that prefix, re-derive the confirmed pairs by splitting on
  the mode's separator and matching each token to a known `{key, value}`
  pair in the locked tag group, deselecting anything that no longer
  matches. A `value-only` token matching more than one key's value
  resolves to the lowest key `id` and returns `kind: 'ambiguous'` with a
  diagnostic hint — a bounded, non-backtracking analogue of SGKV's
  `value-only-auto-resolved`, simpler because TKV's single-tag-group lock
  (requirement 10) rules out SGKV's project-wide backtracking entirely.

Because the box now echoes the current selection, it is never genuinely
empty once a value is picked, even though requirement 6 hides it until
Add/Edit is clicked. Requirement 6 still governs visibility, not content;
this only means "empty" inside an already-open Add/Edit flow now also
means "nothing selected," not just "nothing typed."

### Add/Edit Mutual Exclusion

Requirements 26 and 27 require that Add and Edit can never both be active
at once, and that starting either one locks out the other's controls until
Apply or Cancel. This is tracked with a single piece of panel-local state
rather than two independent flags, so the invalid state of both being
active simultaneously is unrepresentable rather than merely avoided:

```typescript
type ActiveTkvOperation = {tagGroupId: number; type: 'add' | 'edit'} | null;
```

`tagGroupId` identifies which tag's inline selection is open (needed
because Edit opens a specific tag's existing selection, not a blank one);
it is unused while `type: 'add'`, since Add's tag choice is made inside
the still-open selection, not before it opens.

- `null` — steady state. Add is enabled; every entry's Edit/Delete is
  enabled.
- `{type: 'add', ...}` — Add's inline selection (available tags, search,
  PID section) is open. The Add button itself is disabled (clicking it
  again while already open is a no-op, not a second selection); every
  existing entry's Edit and Delete buttons are disabled (requirement 27).
- `{type: 'edit', tagGroupId}` — a specific entry's inline selection is
  open, pre-populated per requirement 8. The Add button is disabled
  (requirement 26); Edit/Delete on every _other_ entry is disabled; the
  entry being edited keeps its own Edit button actionable only insofar as
  it toggles that same inline selection closed (equivalent to Cancel).

The panel's existing Apply/Cancel handlers for the inline selection — the
same ones that already call `onUpdate`/`onAdd` and close the selection —
are extended to also reset this state to `null`, which is what re-enables
every other button. No new prop is needed for this: it is derived state
the panel already needs to know which inline selection (if any) is open,
now also consulted to compute each button's `disabled` state.

**`features/key-configurator/module-configurator-view/ui/module-configuration-panel.tsx`**
— becomes a thin pass-through, forwarding the new TKV props alongside its
existing, untouched calibration-key props.

**`widgets/key-configurator-panel/ui/key-configurator-panel.tsx`** — the
`MODULE` branch of `renderKeyConfigView` reads `KeyConfigSlice` and
`ModuleTagKeyConfigSlice` state via `useGraphDesignerStoreShallow`,
resolving the selected item's real `systemId` as `instanceSystemId` so
the panel's `addTkvs`/`deleteTagGroup`/`deleteTkvs`/`updateTkvParameters`
calls target the right instance. The existing
`instanceId={(item as any).instanceId || 1}` placeholder is replaced with
that real `systemId`. Rewiring the widget's per-item initialization call
itself onto `GraphDesignerStore` — today it calls
`useKeyConfiguratorSelectionStore().initializeConfiguration` instead — is
specified in Calibration Keys' design (Closing the Store-Wiring Gap), a
one-time change the two features share, since both need it and neither
has made it yet.

### Back-End (API + Database Design)

No new backend endpoints are built for reading TKV data — module selection
no longer calls a dedicated tuning-config endpoint at all, since TKV data
comes from Graph Data (already loaded by the existing graph-load flow) and
module parameter definitions come from the already-loaded, per-tab module
list.

Writing TKVs, however, now goes through real endpoints
(`entities/spf-module-data/api/spf-module-api.ts`), called directly from
`ModuleTagKeyConfigSlice`'s mutation actions rather than through a
separate save step:

| Endpoint | Method | Called by |
| --- | --- | --- |
| `/projects/{projectId}/spf-modules/{spfModuleSystemId}/tags` | `POST` (`createTags`) | `addTkvs` (only when the parent tag doesn't exist yet) |
| `/projects/{projectId}/spf-modules/{spfModuleSystemId}/tags` | `DELETE` (`deleteTags`) | `deleteTagGroup` |
| `/projects/{projectId}/spf-modules/{spfModuleSystemId}/tags/{tagSystemId}/tkvs` | `POST` (`createTkvs`) | `addTkvs` |
| `/projects/{projectId}/spf-modules/{spfModuleSystemId}/tags/{tagSystemId}/tkvs` | `DELETE` (`deleteTkvs`) | `deleteTkvs` |
| `/projects/{projectId}/spf-modules/{spfModuleSystemId}/tkv-parameters` | `POST` (`createTkvParameters`) | `addTkvs`, `updateTkvParameters` |
| `/projects/{projectId}/spf-modules/{spfModuleSystemId}/tkv-parameters` | `DELETE` (`deleteTkvParameters`) | `updateTkvParameters` |

`createTkvs` returns `TkvDto[]` directly, giving every newly-created entry
a real, backend-assigned `systemId` (see TKV Identity above). Persistence
happens per-mutation — one or two requests per Add/Delete/PID-update
Apply click — not through a separate bulk save step;
`KeyConfigSlice.saveConfiguration` is unrelated to CKV/TKV (see Graph Data
Write-Back above). Database design is otherwise unaffected; no new
persisted schema is introduced at this layer beyond what the listed
endpoints already imply server-side.

### Interfaces-Services

The entity layer (`entities/key-configurator`) gains two pure functions,
no fetch or store access:

- `transformTagsToConfiguredTkvs(tags: TagInfoDto[]): ConfiguredTkv[]` —
  turns `ModuleInstance.tags` into the panel's `ConfiguredTkv[]` shape,
  carrying `systemId` through from `TkvDto.systemId` (see TKV Identity
  above).
- `transformConfiguredTkvsToTags(tkvs, tagDefinitionsByNaturalId, paramInfoByNaturalId): TagInfoDto[]` —
  the reverse, called before writing back to Graph Data. Groups
  `ConfiguredTkv[]` by `tagGroupId` into one `TagInfoDto` per tag,
  resolving each `systemId` by looking up `naturalId` against the loaded
  tag definitions, and mapping `pidConfig` back to
  `TkvDto.supportedParameters` via the module's parameter definitions.

Both functions take `TagInfoDto`/`TkvDto` from `entities/spf-module-data`
— the type `graph-data-slice.ts` already uses for `ModuleInstance.tags` —
not the separate, incompatible `TagInfoDto`/`TkvDto` set defined in
`entities/key-configurator/model/module-instance-config.dto.ts` (where
`TagInfoDto.tkvs` is required instead of optional). That file exists only
for the fetch-based `ModuleInstanceTuningConfigDto` flow this design
retires (see Closing the Store-Wiring Gap in Calibration Keys' design); it
becomes dead code once `module-instance-coordinator.ts` is deleted, and is
deleted alongside it rather than kept as a second, divergent type family.

### Error Handling

`ModuleTagKeyConfigSlice`'s `initializeModuleTagKeyConfiguration` returns a
boolean, leaving `moduleTagKeys` empty rather than partially populated on
failure, and logs via `~shared/lib/logger`. It does not know about
`keyConfigStatus` — that stays owned by `KeyConfigSlice`'s
`initializeConfiguration`, which awaits the boolean and sets
`keyConfigStatus` to `'error'` or `'ready'` itself (reusing the existing
`SliceStatus` pattern), the same way it already handles its
`subgraph`/`subsystem` branches. Apply-time input validation stays entirely
inside the presentational panel's existing logic — unchanged. Delete
confirmations (tag-level and entry-level) also stay in the panel.

`addTkvs`, `deleteTagGroup`, `deleteTkvs`, and `updateTkvParameters` each
wrap their backend call(s) in `try`/`catch` and check `hasBlockingIssues`
on every response. On a blocking issue or a thrown error, the action calls
`showToast(getIssueMessage(result, fallbackMessage), 'danger')` (or a
fixed fallback message in the `catch` branch), logs via `logger.error`
with `action`/`component`/`error` context, and returns `false`. The panel
keeps its in-progress local state (selected values, PID checklist, open
`ActiveTkvOperation`) on a `false` return rather than closing the Add/Edit
section, so the user can retry without re-entering their selection.

**`deleteTkvs` is the one exception to "no write until the whole action
succeeds."** It processes its batch of targets one owning tag at a time;
if a later tag's `deleteTkvsApi` call fails after an earlier tag's call
already succeeded, it calls `updateModuleTagsLocal` with the
already-applied partial result *before* returning `false` — so Graph Data
reflects whichever tag groups' deletions actually completed on the
backend, not a full rollback to the pre-Apply state. `addTkvs`,
`deleteTagGroup`, and `updateTkvParameters` do not have this partial-write
behavior: each only calls `updateModuleTagsLocal` once, after every one of
its backend call(s) has already succeeded, so a failure at any point
leaves Graph Data completely untouched.

## Security Considerations

No new user input surface or endpoint is introduced. Per-tab and
per-instance state scoping (required by requirements 15 and 16) also acts as
a data-isolation boundary, preventing one project's or one instance's
configured TKVs from leaking into another's state.

## Performance/Scalability Considerations

- Requirements 19 and 20 are satisfied structurally: module selection reads
  already-loaded Graph Data and module-definition state synchronously,
  rather than issuing a network request, so there is no fetch for a second
  selection to duplicate.
- `selectConfiguredTkvs` reads `graphData.moduleInstances[instanceSystemId]`
  directly — a map lookup plus a transform, replacing today's linear scan
  over a per-module instance array.
- Tag-group definitions are cached in slice state after their first fetch
  per project tab, avoiding redundant network calls on repeated module
  selections within the same tab.
- `addTkvs`, `deleteTagGroup`, `deleteTkvs`, and `updateTkvParameters` each
  now issue one or more network round-trips per Apply/Delete click, where
  before there was none. This stays bounded per user action: `addTkvs`
  batches every Cartesian-product combination into a single `createTkvs`
  call (plus at most one `createTags` call when the tag group doesn't
  exist yet, and one `createTkvParameters` call for the chosen PIDs);
  `deleteTagGroup` is a single `deleteTags` call; `deleteTkvs` issues one
  `deleteTkvsApi` call per distinct tag group touched by the batch, not
  one per TKV; `updateTkvParameters` issues at most one
  `createTkvParameters` and one `deleteTkvParameters` call, skipping
  either side that has no PID changes.

## Testing Strategy

### Unit Test Cases

Each TKV configuration stores its own specific PID configuration
(derived via the PID-checklist baseline selector, keyed per instance —
see Front-End Interfaces above). The following test cases carry over from
the existing test suite and continue to apply against the new
`ModuleTagKeyConfigSlice`-based implementation, plus three new cases
(30-32) covering this design's additions:

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
24. `ApplySavesConfiguredTKVs` — validates Apply calls `addTkvs` with the
    full Cartesian-product batch and chosen PIDs (creating the parent tag
    first via `createTags` when it doesn't exist yet), and that the
    resulting `createTkvs` response appears in configuration only after
    the backend call resolves successfully.
25. `CancelDiscardsChanges` — validates Cancel discards in-flight changes.
26. `SelectAllValuesUnderTagKey` — validates Select All selects all values
    under a tag key.
27. `SortByIdAscAndDes` — validates keys sort by ID ascending and
    descending (requirement 22).
28. `SortByNameAscAndDes` — validates keys sort by Name ascending and
    descending (requirement 22).
29. `SearchSpecialCharacters` — validates search handles special
    characters.
30. `LoadsConfiguredTkvsFromGraphData` — validates `selectConfiguredTkvs`
    reads `ModuleInstance.tags` directly from Graph Data, with no network
    request issued.
31. `ApplyWritesBackToGraphData` — validates a successful `addTkvs`/
    `deleteTagGroup`/`deleteTkvs`/`updateTkvParameters` call reaches
    `updateModuleTagsLocal` with the correct, regrouped `TagInfoDto[]` and
    marks Graph Data dirty.
32. `RejectsDuplicateTkvOnApply` — validates Apply rejects an exact
    tag/key/value duplicate (order-independent), and that editing an entry
    excludes that entry from its own duplicate comparison (requirement 24).
33. `PreservesStateAcrossTabSwitch` — validates in-progress Add/Edit
    `useState` (search text, selections, editing tag group) survives
    switching to the Calibration Keys tab and back, since
    `ModuleTagKeysConfigPanel` is never unmounted (requirement 33).
34. `BackendFailureLeavesGraphDataUnchanged` — validates that when
    `createTags`/`createTkvs`/`createTkvParameters` (within `addTkvs`),
    `deleteTags` (within `deleteTagGroup`), or `createTkvParameters`/
    `deleteTkvParameters` (within `updateTkvParameters`) returns a
    blocking issue or throws, the action shows a danger toast, logs via
    `logger.error`, returns `false`, `updateModuleTagsLocal` is never
    called, Graph Data is left unchanged, and the panel's in-progress
    selection is preserved for retry.
35. `DeleteTkvsPartialFailureWritesBackCompletedTags` — validates that
    when `deleteTkvs`'s batch spans more than one tag group and a later
    tag's `deleteTkvsApi` call fails after an earlier tag's call already
    succeeded, `updateModuleTagsLocal` is called with the already-deleted
    tag group's TKVs removed (not a full rollback), a danger toast is
    shown, and the action returns `false`.
36. `UpdateTkvParametersOnlyCallsChangedSide` — validates
    `updateTkvParameters` calls `createTkvParameters` only when PIDs were
    added, `deleteTkvParameters` only when PIDs were removed, and neither
    when the requested PID set matches the TKV's current
    `supportedParameters` exactly.

## Open-Source Libraries

None introduced. This design continues using the existing stack (Zustand
v5, React, QUI, lucide-react).

## Questions

1. **Backend save contract for TKV** (carried from requirements.md) —
   **fully resolved.** Real per-module endpoints now exist (`POST`/
   `DELETE .../tags`, `POST`/`DELETE .../tags/{tagSystemId}/tkvs`, `POST`/
   `DELETE .../tkv-parameters` — see Back-End above) and
   `addTkvs`/`deleteTagGroup`/`deleteTkvs`/`updateTkvParameters` call them
   directly; there is no separate bulk save step, and `saveConfiguration`
   is no longer involved in TKV persistence at all (see Graph Data
   Write-Back above). Unlike CKV's identical question — which remains
   partially open, since CKV's Edit path has no corresponding endpoint
   (see CKV's design, Questions) — TKV has no such gap: TKV's "editing" an
   existing entry (`updateTkvParameters`) is PID-only and never changes a
   TKV's key/value combination, so every TKV mutation already has a real
   backend call.
2. **Definitions refresh during an active session.** `moduleTagKeys` is
   fetched once per project tab and cached for the tab's lifetime. If a
   future feature lets a user import new/updated tag definitions
   mid-session, this slice has no way to learn about it on its own. The
   proposed resolution, deferred until such a feature exists: the import
   action calls `resetModuleTagKeyConfiguration()` (and CKV's equivalent)
   directly after a successful import, which clears `moduleTagKeys`; the
   next `initializeModuleTagKeyConfiguration` call then re-fetches, since
   its already-loaded guard sees an empty cache. This is out of scope for
   the current migration — no import-definitions feature exists today.

## Not Doing

- Calibration key vectors (CKV), subgraph key vectors (SGKV), and subsystem
  key panels are not modified — their UI, business logic, and data-fetch
  paths are untouched.
- The existing configuration-item selection and routing behavior shared
  across all key-configuration sub-panels is not changed.
