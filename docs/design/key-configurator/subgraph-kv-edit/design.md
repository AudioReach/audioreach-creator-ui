# Subgraph Key Vector — On-Demand Keys/Values Fetch — Low-Level Design

> Requirements: [requirements.md](requirements.md) §4.1.2 (rows 23–27), building
> on §4.1.1 (rows 17–22 and 29, the "Added Key Vector(s)" model — note: §7.1
> below identifies that rows 17–22 were frozen as requirements but never
> previously designed or implemented; this document closes that gap,
> **including the backend-persisted half of row 17's merged list and row
> 21's duplicate check (§7.5–7.6, D5)** — row 28 (checked-state from usecase
> overlap) remains deferred; see D5 in §12 for why)
>
> Feature path: `packages/react-app/src/features/key-configurator/subgraph-configurator-view/`
>
> Stores (two, different features — see D2 in §12):
> - Fetch state, including persisted Added Key Vector(s): `packages/react-app/src/features/key-configurator/model/subgraph-config-store.ts`
> - Session-added Added Key Vector(s) state: `packages/react-app/src/features/graph-designer/model/edit-session-slice.ts`
>   (`kvSelectionsById`, new `addKeyVector` action) — a cross-feature dependency; see D2.
>
> Entity clients: `packages/react-app/src/entities/key-definitions/` (available keys/values),
> `packages/react-app/src/entities/key-configurator/` (persisted Added Key Vector(s), §7.5)
>
> Backend endpoints (new, required — see §12): `GET /projects/{projectId}/definitions/graph-keys`,
> `GET /projects/{projectId}/definitions/graph-keys/{keyId}/values`,
> `GET /projects/{projectId}/subgraphs/{subgraphSystemId}/key-vector-config`

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Domain Concepts](#2-domain-concepts)
3. [High-Level Architecture](#3-high-level-architecture)
4. [File Structure](#4-file-structure)
5. [Data Model — DTOs](#5-data-model--dtos)
6. [API Client Layer](#6-api-client-layer)
7. [Store Layer](#7-store-layer)
8. [Control Flow](#8-control-flow)
9. [UI Components](#9-ui-components)
10. [Error Handling](#10-error-handling)
11. [QUI Component Mapping](#11-qui-component-mapping)
12. [Design Decisions and Invariants](#12-design-decisions-and-invariants)
13. [Testing Notes](#13-testing-notes)

---

## 1. Purpose and Scope

This design covers the Subgraph Key Vector Add flow's available-keys data
source and where its resulting "Added Key Vector(s)" entries live:

1. **Fetch** — how `SubgraphKeyVectorConfigPanel` loads the keys and values a
   user picks from when building a new added key vector, changing from
   a single preloaded call to a two-step, on-demand fetch (keys first, then
   values per key on check). This half stays in `subgraph-config-store.ts`.
2. **Added Key Vector(s) storage** — a subgraph's saved entries move out of
   `subgraph-config-store.ts` entirely and into the Graph Designer's
   edit-session slice (`kvSelectionsById`, already defined but previously
   unwired for this flow — see D2 in §12 for why). On Apply, the panel calls
   a new `addKeyVector` action that appends directly to `kvSelectionsById`,
   so the same map that `buildCreateUsecasesRequest` already reads to build
   the create-usecases request (`activeSubgraphs`) is the map the panel
   writes to — no separate store, no sync step between two stores.
3. **Backend-persisted Added Key Vector(s)** — a subgraph's already-saved
   entries (row 17's "existing" half) are fetched into
   `subgraph-config-store.ts` on subgraph selection, merged with
   `kvSelectionsById` for display (§9.4), and passed into `addKeyVector` so
   its duplicate check (row 21) spans both halves (§7.5–7.6). Row 21's "no
   duplicates" guarantee does not hold until this fetch has successfully
   resolved for the current subgraph — Apply is gated on that (row 29,
   §7.6, §9.2).

Backend persistence of `kvSelectionsById` beyond the existing create-usecases
Apply flow is **out of scope** — `addKeyVector` only ever mutates in-memory
edit-session state; it never issues a request itself (the existing Apply
button already sends the whole map via `buildCreateUsecasesRequest` →
`createUsecases`, unchanged by this design).

Requirements are frozen in [requirements.md](requirements.md) §4.1.2; this
document is the low-level design that implements rows 23–27, plus rows
17/21/29 from §4.1.1 (the persisted-entries half). Every requirement row
cited below maps to that document.

**Out of scope:**

- Calibration Key Vector, Tag Key Vector, Subsystem Keys — all three keep
  their existing preloaded-values behavior (`~entities/key-definitions`'s
  `getAllKeyDefinitions` / `getAllTagDefinitions`), per requirements §4.1.2's
  explicit scope note. Their stores (`calibration-keys-store.ts`,
  `module-tag-keys-store.ts`, `subsystem-config-store.ts`) are untouched.
- The "Added Key Vector(s)" list's checkbox semantics (row 18) as a UI
  behavior, no-edit/no-delete behavior (row 19), and per-subgraph panel
  independence (row 22) — these are UI/UX behaviors, not data-shape
  concerns, and are unaffected by this design beyond what §7 and §9
  describe. **Not out of scope:** the underlying storage needed to
  represent one row per added key vector (rows 17, 21) for *both* the
  session-added half (§7.1–7.4) and the backend-persisted half (§7.5–7.6) —
  see those sections, which close both gaps.
- **Row 28 (existing entries' default checked state, computed from
  usecase-selection overlap) remains deferred.** This design fetches and
  renders backend-persisted entries (item 3 above), but does not compute
  their default checked state from usecase overlap — see D5 in §12 for why
  this narrower cut was kept, and the interim default (§9.2, §9.4) used in
  its place. This is the only piece of rows 17–22/28/29 this design does
  not implement.
- `subgraph-config-store.ts`'s `saveToBackend` TODO stub and `reset()` — both
  untouched; `configuredKeyValues`/`addConfiguredKey`/
  `updateConfiguredKeyValues` are deleted outright (§7.1), not deprecated in
  place, since nothing else reads them once the panel is rewired.
- `entities/key-configurator`, `module-instance-coordinator.ts`, the widget
  layer (`KeyConfiguratorPanel`, `ConfiguratorPanel`), and
  `configurator-item.types.ts` — **except** for one new prop
  (`subgraphSystemId`) threaded from the widget layer's already-existing
  `item.systemId` into `SubgraphKeyVectorConfigPanel`, needed for the new
  persisted-entries fetch (§7.5) to call the backend with a real identifier
  rather than a stringified numeric id — see D6 in §12 for why this is
  necessary and why it is scoped narrowly.

**Starting point.** `subgraph-config-store.ts` and
`SubgraphKeyVectorConfigPanel` already exist and are functional (loading
keys with values nested, via `getAllKeyDefinitions`; storing configured
values in a flat per-subgraph list). `edit-session-slice.ts` already defines
`kvSelectionsById`/`KvSelection` (consumed today only by
`buildCreateUsecasesRequest`) but nothing populates it yet — this design is
its first writer. This document reshapes the available-keys half of
`subgraph-config-store.ts` in place, deletes its added-key-vector half, adds
a new persisted-entries fetch to it, and adds one new action to
`edit-session-slice.ts`; it does not introduce a new feature slice for
either.

---

## 2. Domain Concepts

| Concept                 | Meaning in this design                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Graph key summary        | A key's identity (id, name) without its values — the payload of the new keys-only endpoint.                                                                              |
| On-demand values fetch   | A key's values are only requested from the backend once the user checks that key's checkbox, never preloaded alongside the keys list.                                    |
| Per-key fetch state      | Independent `loading` / `loaded` / `error` status tracked per `keyId`, so one key's fetch outcome never affects another's.                                               |
| Always-refetch           | Checking a key always issues a new values request, even if that key was previously checked and unchecked earlier in the same Add-panel session — no session-level cache. |
| Added key vector         | One Apply's worth of checked key-value pairs, stored as a single `KvSelection` in `kvSelectionsById[subgraphId]` — the unit rows 17/21 operate on.                       |
| Selection-only checkbox  | The per-row checkbox in "Added Key Vector(s)" toggles `KvSelection.selected`, which controls whether that row is included in the Apply request — not whether it exists.  |
| Persisted key vector     | An added key vector already saved to the backend for this subgraph, distinct from a session-added `KvSelection` — fetched once per subgraph selection (§7.5), never written by `addKeyVector`, never sent by the whole-session Apply (row 17: display-only). |
| Merged list              | The union of persisted key vectors and `kvSelectionsById[subgraphId]` that `AddedKeyVectorList` renders (row 17) — the scope the duplicate check (row 21) and row 18's checkbox uniformly cover. |

---

## 3. High-Level Architecture

Three layers, bottom-up (FSD: `entities` → `features` model → `features` UI),
plus one cross-feature edge from the Add-flow panel to the Graph Designer's
edit-session slice:

```
┌───────────────────────────────────────────────────────────────────┐
│ UI (features/key-configurator/subgraph-configurator-view/ui)       │
│   SubgraphKeyVectorConfigPanel  ← Add-flow container, search,       │
│                                    Select All, Apply/Cancel;          │
│                                    merges persisted + kvSelectionsById│
│                                    for AddedKeyVectorList (row 17)    │
│   GraphKeyRow                   ← per-key checkbox + values panel   │
└───────────────▲────────────────────────────┬─────────────▲──────────┘
                │ reads/calls                 │ calls       │ re-renders:
                │                              │ addKeyVector│ kvSelectionsById
┌───────────────┴─────────────────────┐        │(+ persisted  │ changed, same
│ Store (key-configurator/model/       │        │ pairs)       │ commit (I6)
│  subgraph-config-store.ts)           │        ▼             │
│   availableGraphKeys, keysLoadState, │  ┌──────────────────┴──────────┐
│   fetchGraphKeys                     │  │ Graph Designer store          │
│   keyValuesState (per keyId),        │  │ (graph-designer-store-        │
│   fetchKeyValues, clearKeyValuesState│  │  context.ts) — composes       │
│   persistedKvEntriesById (per        │  │  edit-session-slice.ts        │
│   subgraphId), persistedKvLoadState  │  │   kvSelectionsById,           │
│   ById, fetchPersistedKeyVectors ← new│  │   addKeyVector (new):         │
└───────────────▲──────────────────────┘  │    1. duplicate check (get(), │
                │ calls                    │       spans kvSelectionsById  │
┌───────────────┴──────────────────────┐  │       + persisted param, §7.6)│
│ Entity clients                        │  │    2. set() ← *is* this       │
│   entities/key-definitions:           │  │       store's state update,   │
│   getAllGraphKeys / getGraphKeyValues │  │       not a hop to a          │
│   ← new                               │  │       separate store (I6)     │
│   getAllKeyDefinitions /              │  └────────────────────────────────┘
│   getAllTagDefinitions ← unchanged,   │
│   used by other key types             │
│                                        │
│   entities/key-configurator:          │
│   getSubgraphConfig ← new (§7.5)      │
└────────────────────────────────────────┘
```

The right-hand box is a single Zustand store, not two — `edit-session-slice.ts`
is composed directly into the Graph Designer store via
`createEditSessionSlice` (`graph-designer-store-context.ts`); it is not a
separate store that this design then wires up to "the store." That is why
step 2 inside `addKeyVector` (`set()`) and the UI's re-render are drawn as
one continuous path with no intermediate box: `set()` mutates this store's
state directly, and every component subscribed to `kvSelectionsById` via
`useGraphDesignerStoreShallow` (top box, "re-renders" arrow) re-renders from
that same update, in the same commit. See I6 in §12 for why this matters for
the "always in sync, no duplicates" guarantee.

Persisted entries deliberately stay on the key-configurator side
(`subgraph-config-store.ts`) rather than getting a second field in
`edit-session-slice.ts` — the panel is the one place that already reads
both stores, so it is the natural place to merge them for display (§9.4),
and it passes the persisted list into `addKeyVector` as an explicit
parameter for the duplicate check (§7.6) rather than `addKeyVector` reaching
across features to read it itself (see D5 in §12 for why this direction was
chosen over the alternative of a second graph-designer field).

`subgraph-config-store.ts` no longer holds any *session-added* "Added Key
Vector(s)" state — that half is fetch-state-plus-persisted-entries only
after this design (§7.1, §7.5). The panel component reads
`kvSelectionsById[subgraphId]` from the Graph Designer store (via
`useGraphDesignerStoreShallow`, the same hook `ApplyDiscardControls` and
`useKeyConfigurator` already use — see D2 in §12) for the session-added half
of its list rendering, and its own `subgraph-config-store` hooks for the
fetch/available-keys half plus the persisted-entries half (§7.5).

No widget-layer changes beyond one new prop — `ConfiguratorPanel`'s existing
per-selected-item section rendering already satisfies "one panel per
selected subgraph" (row 22) without modification; see D6 in §12 for the one
new prop (`subgraphSystemId`) threaded through the widget layer.

---

## 4. File Structure

**Changed — entity client (`packages/react-app/src/entities/key-definitions/`):**

| File                          | Change                                                |
| ------------------------------ | ------------------------------------------------------ |
| `model/key-definition.dto.ts` | Add `GraphKeySummaryDto`                              |
| `api/key-definition-api.ts`   | Add `getAllGraphKeys`, `getGraphKeyValues`            |
| `index.ts`                    | Export the two new functions and `GraphKeySummaryDto` |

**New/changed — entity client (`packages/react-app/src/entities/key-configurator/`):**

| File                            | Change                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `model/subgraph-config.dto.ts`  | Complete the existing stub: add `keyValueCollection: KeyValueInfo[]` to `SgkvDto` (§5, §7.5). `SubgraphConfigDto` unchanged. |
| `api/subgraph-config-api.ts`    | New — `getSubgraphConfig(projectId, subgraphSystemId)` (§6)                                                                 |
| `index.ts`                      | Export `getSubgraphConfig`, `SubgraphConfigDto`, `SgkvDto`                                                                   |

**Changed — key-configurator store (`packages/react-app/src/features/key-configurator/model/`):**

| File                        | Change                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subgraph-config-store.ts` | Replace `availableKeys`/`initialize` with `availableGraphKeys`, `keysLoadState`, `fetchGraphKeys`, `keyValuesState`, `fetchKeyValues`, `clearKeyValuesState`. **Delete** `configuredKeyValues`, `addConfiguredKey`, `updateConfiguredKeyValues`, and `saveToBackend` outright (§7.1–7.2) — added-key-vector storage moves to `edit-session-slice.ts`, not to a renamed field here. **Add** `persistedKvEntriesById`, `persistedKvLoadStateById`, `fetchPersistedKeyVectors` (§7.5). |

**Changed — Graph Designer edit-session slice (`packages/react-app/src/features/graph-designer/model/`):**

| File                     | Change                                                                                                                                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `edit-session-slice.ts` | Add `addKeyVector(subgraphId: string, keyValuePairs: KeyValue[], persistedKeyValuePairs: KeyValue[][]): boolean` to `EditSessionSlice` — the only writer of `kvSelectionsById` this design introduces, and also the sole enforcer of the duplicate check across both halves (§7.6). `KvSelection`, `kvSelectionsById`, and `INITIAL_SESSION_LOCAL_STATE` are unchanged in shape — they already support this (§7.1). |

**Changed/new — view (`packages/react-app/src/features/key-configurator/subgraph-configurator-view/`):**

| File                                       | Change                                                                                                                                                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/sgkv.mapper.ts`                       | Remove `transformKeyDefinitionsToGraphKeys`/`transformKeyDefinitionToGraphKey`; add `transformGraphKeySummariesToKeys`, `transformSgkvDtosToPersistedKvEntries` (§7.5, §9.1)                                                              |
| `ui/graph-key-row.tsx`                    | New — extracted per-key checkbox + values sub-block                                                                                                                                                                                        |
| `ui/added-key-vector-list.tsx`            | New — extracted "Added Key Vector(s)" list (row 17 panel, per-row checkbox), rendering the merged list of persisted entries + `kvSelectionsById[subgraphId]` (§9.4)                                                                       |
| `ui/subgraph-key-vector-config-panel.tsx` | Add-flow internals rewired to the new fetch-state shape; fetches persisted entries on mount/subgraph-selection (§7.5, §8); Apply calls `addKeyVector` (cross-feature, §7.6) with the persisted list, gated on `persistedKvLoadStateById` (row 29, §9.2); renders `GraphKeyRow` per key and `AddedKeyVectorList` for the merged rows. Gains a new `subgraphSystemId: string` prop (D6). |
| `ui/subgraph-config.types.ts`             | `ConfiguredSubgraphKeyValue` stays (§5) — the Add-flow panel's local selection state still uses it before Apply projects it to `KeyValue[]`. Add `PersistedKvEntry` (§5).                                                                 |

**Changed — widget layer (`packages/react-app/src/widgets/key-configurator-panel/`):**

| File                       | Change                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/key-configurator-panel.tsx` | Pass `item.systemId` (already present on `SubgraphConfigurationItem`, `configurator-item.types.ts` — no type change needed) into `SubgraphKeyVectorConfigPanel` as its new `subgraphSystemId` prop (D6). |

---

## 5. Data Model — DTOs

New DTO in `entities/key-definitions/model/key-definition.dto.ts`, alongside
the existing `KeyDefinitionResponseDto`/`ValueDefinitionDto`:

```ts
export interface GraphKeySummaryDto {
  cHeaderGraphKeyEnumValue: string;
  description: string;
  keyId: number;
  name: string;
  systemId: string;
}
```

Mirrors `KeyDefinitionResponseDto` minus `values`, `isGraphKey`,
`isCalibrationKey`, `isDynamic`, `isVoice`, `specialKey`,
`cHeaderCalibrationKeyEnumValue`, `cHeaderEnumName`, `cHeaderEnumValue` —
fields irrelevant to a graph-key-only response.

No new DTO is needed for the values response — `getGraphKeyValues` reuses
the existing `ValueDefinitionDto[]` shape.

No changes to `KeyDefinitionResponseDto`, `TagDefinitionResponseDto`, or any
DTO consumed by Calibration/Tag/Subsystem — they keep calling
`getAllKeyDefinitions`/`getAllTagDefinitions` unchanged.

No DTOs are added for persisting `kvSelectionsById` — Apply already sends it
to the backend via the existing `SubgraphKvSelectionDto`/
`CreateUsecasesRequestDto` (`~entities/edit-session`), unchanged by this
design (see §7.4, §8).

**`KeyValue.valueSystemId` becomes required for this flow.** `KeyValue`
(`~entities/usecases`, aliasing `KeyValueInfo`) pairs a `keyInfo: KeyInfo`
with a `valueInfo: ValueInfo`, and `ValueInfo.valueSystemId` is the field
`buildCreateUsecasesRequest` projects into the wire request
(`SubgraphKvSelectionDto.valueSystemIds`). Every `KeyValue` this flow pushes
into a `KvSelection.keyValuePairs` must carry a real `valueSystemId` for that
projection to produce a usable request. `transformValueDefinition` (reused
from the Calibration Keys mapper, see §9.1) maps `ValueDefinitionDto.systemId`
into this field, so no mapper change is needed to satisfy it — see D4 in §12
for why the previous `ConfiguredSubgraphKeyValue`-based flow never populated
this field at all (it fed a store no one wired to the request) and how this
design closes that gap by making the panel construct real `KeyValue` objects
on Apply.

**`SgkvDto` (persisted key vectors) — completing the existing stub.**
`entities/key-configurator/model/subgraph-config.dto.ts` already declares:

```ts
export interface SubgraphConfigDto {
  sgkvs: SgkvDto[];
  systemId: string;
}

export interface SgkvDto {
  systemId: string;
}
```

`SubgraphConfigDto` is unchanged by this design. `SgkvDto` gains the one
field it was always missing:

```ts
export interface SgkvDto {
  keyValueCollection: KeyValueInfo[];
  systemId: string;
}
```

`KeyValueInfo` (`~entities/usecases`) is reused directly — the same type
`UsecaseDto.keyValueCollection` already uses — rather than inventing a new
key-value wire shape for this one endpoint. `SgkvDto.systemId` identifies
the persisted key vector itself (its own backend identity, for
`PersistedKvEntry.systemId` below); it is unrelated to the subgraph's
`systemId` on the enclosing `SubgraphConfigDto`.

**`PersistedKvEntry` — the UI-facing shape for a persisted key vector,**
added to `subgraph-configurator-view/ui/subgraph-config.types.ts`:

```ts
export interface PersistedKvEntry {
  keyValuePairs: KeyValue[];
  systemId: string;
}
```

Deliberately shaped like `KvSelection` minus `selected` — a persisted entry
has no session-local checkbox-override state to carry in this design (row 28
is deferred, D5), and is never a candidate for `buildCreateUsecasesRequest`
(row 17: display-only, excluded from the Apply request entirely). Produced
from `SgkvDto[]` by `transformSgkvDtosToPersistedKvEntries` (§7.5, §9.1),
one `PersistedKvEntry` per `SgkvDto`, `keyValuePairs` built via the same
`transformValueDefinition`-adjacent mapping used elsewhere in this design so
`valueSystemId` is populated consistently with session-added entries (§5
above).

---

## 6. API Client Layer

New functions in `entities/key-definitions/api/key-definition-api.ts`:

```ts
export async function getAllGraphKeys(
  projectId: string,
): Promise<ApiResult<GraphKeySummaryDto[]>> {
  return httpClient.get<GraphKeySummaryDto[]>(
    `/projects/${projectId}/definitions/graph-keys`,
  );
}

export async function getGraphKeyValues(
  projectId: string,
  keyId: number,
): Promise<ApiResult<ValueDefinitionDto[]>> {
  return httpClient.get<ValueDefinitionDto[]>(
    `/projects/${projectId}/definitions/graph-keys/${keyId}/values`,
  );
}
```

Both follow the existing `ApiResult<T>` contract (`~shared/api`) used by
every other entity client in the codebase, and are exported from
`entities/key-definitions/index.ts` alongside the existing exports
(`getAllKeyDefinitions`, `getAllTagDefinitions`, `KeyDefinitionResponseDto`,
`TagDefinitionResponseDto`, plus the new `GraphKeySummaryDto`).

The route is named `graph-keys` (a dedicated resource) rather than adding a
query flag to the existing `/definitions/keys`, since `isGraphKey` filtering
currently happens client-side against the shared keys collection — a
dedicated resource lets the backend filter server-side too. If the backend
team prefers a query-flag approach on the existing route instead, that is an
implementation detail the frontend contract above does not depend on. See
§12 for the backend dependency this introduces.

No API function is added for persisting `kvSelectionsById` from within this
Add-flow panel — `addKeyVector` only updates edit-session state; the
existing whole-session Apply (`useApplyDiscard` → `createUsecases`) is the
only network call that ever transmits it, and it is untouched by this
design (see §7.6, §8).

New function in `entities/key-configurator/api/subgraph-config-api.ts`
(new file):

```ts
export async function getSubgraphConfig(
  projectId: string,
  subgraphSystemId: string,
): Promise<ApiResult<SubgraphConfigDto>> {
  return httpClient.get<SubgraphConfigDto>(
    `/projects/${projectId}/subgraphs/${subgraphSystemId}/key-vector-config`,
  );
}
```

Takes the subgraph's real `systemId`, not its numeric `id` — see D6 in §12
for why this distinction matters here specifically (the existing
`kvSelectionsById`/`addKeyVector` machinery uses a stringified numeric id
for an unrelated purpose, and this new endpoint must not repeat that).
Exported from `entities/key-configurator/index.ts` alongside
`getModuleInstanceTuningConfig`. Follows the same `ApiResult<T>` contract as
every other entity client function in the codebase, including the two new
`entities/key-definitions` functions above.

---

## 7. Store Layer

### 7.1 Current shape

```ts
interface ConfiguredKeyValues {
  keyValueList: ConfiguredSubgraphKeyValue[]; // flat — no boundary between added key vectors
  subgraphId: number;
}

availableKeys: Record<string, GraphKey> | null; // GraphKey.values fully nested
initialize: (projectId: string) => Promise<boolean>; // fetch + transform in one shot
configuredKeyValues: ConfiguredKeyValues[];
addConfiguredKey: (subgraphId: number, key: ConfiguredSubgraphKeyValue) => void;
```

Separately, `edit-session-slice.ts` (Graph Designer feature) already defines:

```ts
export interface KvSelection {
  keyValuePairs: KeyValue[];
  selected: boolean;
  systemId: string;
}

kvSelectionsById: Record<string, KvSelection[]>; // keyed by subgraphId (string)
```

`kvSelectionsById` is consumed today only by `buildCreateUsecasesRequest`
(`activeSubgraphs` projection) — nothing populates it. The two "Added Key
Vector(s)" representations above are unconnected: `subgraph-config-store.ts`
holds the panel's actual saved rows, keyed by numeric `subgraphId`, with no
`selected` flag and no relationship to the create-usecases request; and
`kvSelectionsById` is the shape the Apply request actually needs, but has no
writer.

**Gap this design closes (rows 17, 20, 21, 29 in full; row 28 remains
deferred — see §1, D5).** Rows
17–22 (the "Added Key Vector(s)" model) were frozen as requirements but
never actually designed or implemented — `configuredKeyValues` today is
still the old single-flat-list shape, with no boundary between one Apply's
pairs and another's, and it feeds nothing else in the system. The current
panel's Apply handler works around this by calling `addConfiguredKey` once
per selected pair, which produces the same flat list the old single-config
model used — not one row per Apply as row 17 requires, and disconnected
from the actual Apply/create-usecases flow. §7.2 resolves this by deleting
`configuredKeyValues` and its actions from `subgraph-config-store.ts` and
adding the one missing piece — a writer — to `edit-session-slice.ts`'s
already-correct `kvSelectionsById` shape, instead of introducing a third
representation. This closes the gap for entries added in the current
session; §7.5–7.6 close the remaining half — fetching and checking against
backend-persisted entries (row 17's other half, row 21's full-list check) —
leaving only row 28 (checked-state from usecase overlap) deferred, per D5
in §12.

### 7.2 New shape — `subgraph-config-store.ts` (fetch state, plus persisted entries)

```ts
interface KeyValuesEntry {
  status: 'loading' | 'loaded' | 'error';
  values: KeyValue[];
}

interface SubgraphConfigStore {
  projectId: string;
  reset: () => void;

  // --- new: available keys (no nested values) ---
  availableGraphKeys: Key[] | null;
  keysLoadState: 'idle' | 'loading' | 'error';
  fetchGraphKeys: (projectId: string) => Promise<boolean>;

  // --- new: per-key values, fetched on demand ---
  keyValuesState: Record<number, KeyValuesEntry>; // keyed by keyId
  fetchKeyValues: (projectId: string, keyId: number) => Promise<boolean>;
  clearKeyValuesState: () => void;

  // --- new: backend-persisted Added Key Vector(s), §7.5 ---
  persistedKvEntriesById: Record<number, PersistedKvEntry[]>; // keyed by subgraphId (numeric)
  persistedKvLoadStateById: Record<number, 'idle' | 'loading' | 'loaded' | 'error'>;
  fetchPersistedKeyVectors: (
    projectId: string,
    subgraphId: number,
    subgraphSystemId: string,
  ) => Promise<boolean>;

  // --- changed semantics, same signature ---
  clearCache: () => void; // now also clears availableGraphKeys, keysLoadState, keyValuesState, persistedKvEntriesById, persistedKvLoadStateById
}
```

`configuredKeyValues`, `addConfiguredKey`, and `updateConfiguredKeyValues`
are **deleted**, not renamed or deprecated — after this design,
`subgraph-config-store.ts` holds the Add-flow's fetch state (available keys
+ per-key values) plus backend-persisted Added Key Vector(s), never any
session-added-row state (that lives in `edit-session-slice.ts`, §7.3).
`saveToBackend` is also deleted along with them: it operated on
`configuredKeyValues`, which no longer exists in this store, and Apply's
actual backend call already goes through `useApplyDiscard`/`createUsecases`
against `kvSelectionsById` (§7.6, §8) — there is nothing left for a second,
store-local `saveToBackend` stub to do.

`Key` (`~shared/types/key-configurator-config.types.ts`) is reused directly
for `availableGraphKeys` rather than introducing a new alias — it is already
`{id: number; name: string}`, the exact shape needed.

`persistedKvEntriesById`/`persistedKvLoadStateById` are keyed by the numeric
`subgraphId` prop the panel already receives (§3), matching this store's
existing `keyValuesState` keying convention — not by `subgraphSystemId`,
which exists only as an input to the fetch call itself (§7.5), never as a
map key. Both default to empty (`{}`) and are populated only by
`fetchPersistedKeyVectors`.

`initialize(projectId: string)` is removed from this store's public
surface. The store no longer eagerly loads keys on `KeyConfiguratorStore`'s
`initializeConfiguration` dispatch for `SUBGRAPH` context — instead it only
sets `projectId` (mirroring `useSubsystemConfigStore.initialize`'s
sync-only pattern), since the actual keys fetch is deferred to Add-panel
open (§8), and the persisted-entries fetch is deferred to subgraph
selection (§7.5, §8).

### 7.3 New shape — `edit-session-slice.ts` (session-added Added Key Vector(s) state)

`KvSelection`/`kvSelectionsById` are unchanged in shape (§7.1). One action
is added to `EditSessionSlice`:

```ts
export interface EditSessionSlice {
  // ...existing members unchanged...
  addKeyVector: (
    subgraphId: string,
    keyValuePairs: KeyValue[],
    persistedKeyValuePairs: KeyValue[][],
  ) => boolean;
}
```

Returns `false`, without mutating state, if `keyValuePairs` exactly matches
an existing entry in `kvSelectionsById[subgraphId]` **or** any entry in
`persistedKeyValuePairs` (row 21 — see §7.6); returns `true` after appending
otherwise. The return value is how the panel distinguishes "rejected as a
duplicate" from "added" (§9.2) — there is no separate query action for this,
since the check must run against the same in-memory state `addKeyVector` is
about to mutate (for the `kvSelectionsById` half), and duplicating that
state read into a second call site would risk it drifting out of sync with
the check `addKeyVector` actually performs. `persistedKeyValuePairs` is a
plain parameter, not a second store field, precisely so `addKeyVector`
itself gains no new cross-feature read — see D5 in §12 for why persisted
entries are threaded in this way rather than mirrored into a second
graph-designer field.

### 7.4 Behavior — session-added half

- **`addKeyVector(subgraphId, keyValuePairs, persistedKeyValuePairs)`** (new,
  in `edit-session-slice.ts`) — first runs the duplicate check (§7.6); if it
  matches an existing entry in either input, returns `false` and performs no
  mutation. Otherwise appends one new `KvSelection` to
  `kvSelectionsById[subgraphId]` (creating the array if the subgraph has no
  entries yet): `{keyValuePairs, selected: true, systemId:
  <client-generated>}` (row 17: one row per Apply, not one row per pair), and
  returns `true`. `selected: true` by default, per row 18 — every added
  entry remains part of the active configuration regardless of checkbox
  state, and `buildCreateUsecasesRequest` only includes `selected` entries in
  the Apply request, so a newly-added row must start selected to be included
  at all until the user unchecks it. The `systemId` is generated client-side
  (`crypto.randomUUID()`) purely as a stable React list key / duplicate-check
  identity for this row — it is never sent to the backend;
  `buildCreateUsecasesRequest` reads only
  `keyValuePairs[].valueInfo.valueSystemId`, never `KvSelection.systemId`
  itself (see D3 in §12 for why this differs from the `KvSelection` doc
  comment's original "backend-offered combination" framing). Appending is the
  **only** mutation `addKeyVector` performs — there is no update/replace
  action, since updating or removing an existing entry is not supported (row
  19). The duplicate check and the append happen inside one synchronous
  `set()`-backed call, like every other `edit-session-slice.ts` action — no
  store-only-vs-backend distinction to document, since it was never going to
  call the backend (§1).
- **`fetchGraphKeys(projectId)`** — called every time the Add panel opens
  (row 23: no caching across opens). Sets `keysLoadState: 'loading'`, calls
  `getAllGraphKeys`, transforms via `transformGraphKeySummariesToKeys`
  (§9.1), and always overwrites `availableGraphKeys` on success —
  `keysLoadState: 'error'` on failure, with the error logged via
  `~shared/lib/logger` (matching the store's existing logging pattern).
- **`fetchKeyValues(projectId, keyId)`** — called when a key's checkbox is
  checked (row 24), and by Select All for every newly-checked key (row 27).
  Always fetches fresh — no "already loaded" short-circuit — since row 24
  requires refetch on every check, even a recheck within the same Add-panel
  session. Synchronously sets
  `keyValuesState[keyId] = {status: 'loading', values: []}` before the
  `await`, so the UI can show a spinner immediately; on resolution, sets
  `status: 'loaded'` with the transformed values, or `status: 'error'` with
  `values: []`.
- **Per-key independence** — each `fetchKeyValues` call reads and writes
  only its own `keyValuesState[keyId]` entry, so concurrent calls (e.g. from
  Select All checking many keys at once) never race each other. Each key's
  row transitions loading → loaded/error independently as its own request
  resolves, matching row 27.
- **`clearKeyValuesState()`** — resets `keyValuesState` to `{}`. Called by
  the panel on both Cancel and successful Apply (§9.2), so no stale per-key
  value state leaks into the next Add-panel session — this is the mechanism
  that enforces "no session-level caching" (row 24) structurally, rather
  than relying on every call site remembering to skip a cache check.
- **`reset()`** is unaffected in signature — still clears all state to
  initial — but now also clears the new `availableGraphKeys`/
  `keysLoadState`/`keyValuesState`/`persistedKvEntriesById`/
  `persistedKvLoadStateById` fields (§7.2, §7.5). It no longer touches
  `configuredKeyValues` (deleted, §7.2). `kvSelectionsById` is cleared by
  `edit-session-slice.ts`'s own `exitEditMode()`/`resetSessionLocalMaps()`
  (unchanged, pre-existing behavior) — `subgraph-config-store.ts`'s `reset()`
  has no reach into the Graph Designer store and does not attempt to clear it.

### 7.5 Behavior — persisted-entries fetch (`subgraph-config-store.ts`)

- **`fetchPersistedKeyVectors(projectId, subgraphId, subgraphSystemId)`** —
  called once per subgraph on subgraph selection (§8; the panel calls it in
  an effect keyed on `subgraphId`, not on every Add-panel open — unlike
  `fetchGraphKeys`/row 23, there is no "always refetch" requirement for
  persisted entries in the requirements, so this design fetches once per
  selection rather than once per Add-panel open). Sets
  `persistedKvLoadStateById[subgraphId] = 'loading'`, calls
  `getSubgraphConfig(projectId, subgraphSystemId)`
  (`entities/key-configurator`, §6), transforms the response's `sgkvs` via
  `transformSgkvDtosToPersistedKvEntries` (§9.1) into
  `persistedKvEntriesById[subgraphId]`, and sets
  `persistedKvLoadStateById[subgraphId] = 'loaded'` on success or `'error'`
  on failure (error logged via `~shared/lib/logger`, matching this store's
  existing pattern). Takes `subgraphSystemId` as an explicit parameter
  rather than looking it up internally — this store has no other source for
  it (D6 in §12) — the panel passes the value from its own new prop (§9.2).
- **Per-subgraph independence** — keyed by numeric `subgraphId`, matching
  `persistedKvEntriesById`'s keying (§7.2); one subgraph's fetch outcome
  never affects another's, consistent with `keyValuesState`'s existing
  per-key independence pattern (§7.4, I2).
- **No retry-on-Add-panel-open.** Unlike `fetchGraphKeys`/`fetchKeyValues`,
  this fetch is not tied to the Add-flow panel's open/close lifecycle — it
  runs once per subgraph selection regardless of whether the Add panel is
  ever opened for that subgraph, since row 17's merged list must render
  correctly even before the user clicks "+". A failed fetch can be retried
  via a retry affordance on the merged list itself (§9.4, §10), independent
  of the Add-flow panel's state.
- **`reset()`/`clearCache()`** clear `persistedKvEntriesById`/
  `persistedKvLoadStateById` to `{}` (§7.2), same as the other fetch-state
  fields — a full store reset re-fetches on next selection rather than
  serving stale persisted entries.

### 7.6 Behavior — duplicate check and the Apply gate (row 21, row 29)

- **Duplicate check** runs *inside* `addKeyVector`, against `get()`'s
  current `kvSelectionsById[subgraphId]` **and** the `persistedKeyValuePairs`
  parameter (§7.3) — not in the panel. `addKeyVector` compares the new set
  of key-values against each entry in both inputs for an exact match (same
  set of key IDs + same value IDs, order-independent) and returns `false`
  without appending if any one matches, since a duplicate is defined per
  row, not per pair, and "existing entry" spans the full merged list (row
  17) regardless of which half it came from. Enforcing the
  `kvSelectionsById` half inside the one function that writes it — rather
  than as a precondition the panel is responsible for checking before
  calling it — means no caller can add a duplicate against a session-added
  entry by skipping or getting that half of the check wrong; the action is
  self-guarding for that half regardless of what calls it, now or in a
  future caller. The panel's role (§9.2) is limited to (a) supplying the
  current persisted list as the parameter and (b) reading the boolean
  result and deciding what to show — it performs no duplicate comparison of
  its own.
- **The persisted half depends on the caller supplying a current list** —
  unlike the `kvSelectionsById` half, `addKeyVector` cannot independently
  verify that `persistedKeyValuePairs` reflects the subgraph's actual
  persisted entries; it trusts the parameter. This is why row 29's Apply
  gate exists: the panel must never call `addKeyVector` with a persisted
  list that might be incomplete. **Apply is blocked** (inline error, no
  `addKeyVector` call) whenever
  `persistedKvLoadStateById[subgraphId] !== 'loaded'` — i.e. while the fetch
  is still `'loading'`, has never been triggered (`'idle'`), or ended in
  `'error'` (§9.2, §10). This is the one place this design accepts a
  caller-supplied input to a guarantee it otherwise keeps fully
  self-contained — see D5 in §12 for the trade-off this represents.
- **Type signature enforces the parameter is not forgotten** — `addKeyVector`
  takes `persistedKeyValuePairs: KeyValue[][]` as a required (non-optional)
  parameter, not `?: KeyValue[][]`, so a call site that omits it fails to
  compile rather than silently checking against an empty list.

---

## 8. Control Flow

0. Subgraph is selected → panel calls `fetchPersistedKeyVectors(projectId,
   subgraphId, subgraphSystemId)` once (§7.5) →
   `persistedKvLoadStateById[subgraphId]: 'loading'` →
   `AddedKeyVectorList` renders the persisted half of the merged list once
   resolved (or shows a retry affordance on failure, §10). This runs
   independently of the Add-flow panel below — it is not gated on the user
   ever clicking "+".
1. User clicks "+" → panel calls `fetchGraphKeys(projectId)` →
   `keysLoadState: 'loading'` → keys list renders once resolved (or shows
   the list-level error/retry on failure, §10).
2. User checks a key's checkbox → `GraphKeyRow`'s `onCheckChange` calls
   `fetchKeyValues(projectId, keyId)` → that key's row shows a spinner →
   renders the radio group once resolved (or an inline error/retry, §10).
3. User picks a value via the radio group → local component state
   (`selectedValues`) records it, unchanged from the current implementation.
4. User clicks Select All → panel checks every visible/filtered key and
   fires one `fetchKeyValues` per newly-checked key as a plain loop (not
   awaited together) — each row updates independently as its own fetch
   resolves.
5. User clicks Apply → **first**, the panel checks
   `persistedKvLoadStateById[subgraphId] === 'loaded'` (row 29, §7.6); if
   not, it shows an inline error and stops — no validation below runs, no
   `addKeyVector` call happens. Otherwise, existing validation (≥1 pair,
   §7.4) runs against local `selectedValues`/`selectedKeys` state; on
   success, the panel assembles one `KeyValue[]` from all checked keys'
   selected values (`keyInfo`/`valueInfo` built from
   `availableGraphKeys`/`keyValuesState`, carrying real `valueSystemId`s per
   §5), reads `persistedKvEntriesById[subgraphId]` and projects it to
   `KeyValue[][]`, and calls `addKeyVector(subgraphId, keyValuePairs,
   persistedKeyValuePairs)` **once** on the Graph Designer store — a
   cross-feature call, not a call into `subgraph-config-store.ts`.
   `addKeyVector` runs the duplicate check itself against both inputs
   (§7.6) and returns `false` without mutating state if the set matches any
   existing entry, from either half — the panel shows an inline error and
   keeps the current selection intact (row 21, §10). On `true`, a new
   `KvSelection` has been appended to `kvSelectionsById[subgraphId]`;
   `clearKeyValuesState()` then runs (on `subgraph-config-store.ts`) and the
   panel closes.
6. User clicks Cancel → `clearKeyValuesState()` runs immediately and the
   panel closes, discarding all in-progress selection with no prompt (row
   20).
7. "Added Key Vector(s)" list renders the merged list — the panel combines
   `persistedKvEntriesById[subgraphId]` (from `subgraph-config-store.ts`,
   step 0) with `kvSelectionsById[subgraphId]` (from the Graph Designer
   store) into one array for `AddedKeyVectorList` (§9.4). A step 5 Apply is
   immediately visible in this list without any extra store sync for the
   `kvSelectionsById` half, since both write and read target the same map
   (I6); the persisted half only changes via step 0's fetch (or its retry,
   §10), never via Apply.

The whole-session Apply (`useApplyDiscard`'s `apply()`) is the only place
`kvSelectionsById` is ever sent over the network, via
`buildCreateUsecasesRequest` → `createUsecases` — unchanged by this design
(see §1, §7). `persistedKvEntriesById` is never sent by this or any other
network call (row 17: display-only).

---

## 9. UI Components

### 9.1 Mapper changes

**`sgkv.mapper.ts`:**

- **Removed**: `transformKeyDefinitionsToGraphKeys` and
  `transformKeyDefinitionToGraphKey` — no longer needed, since
  `subgraph-config-store.ts` no longer consumes `KeyDefinitionResponseDto[]`.
- **New**: `transformGraphKeySummariesToKeys(dtos: GraphKeySummaryDto[]): Key[]`
  — `dtos.map(dto => ({id: dto.keyId, name: dto.name}))`.
- **New**: `transformSgkvDtosToPersistedKvEntries(dtos: SgkvDto[]):
  PersistedKvEntry[]` — `dtos.map(dto => ({systemId: dto.systemId,
  keyValuePairs: dto.keyValueCollection}))`. `SgkvDto.keyValueCollection` is
  already `KeyValueInfo[]` (§5), the same shape as `KeyValue`
  (`~entities/usecases` aliases `KeyValueInfo` as `KeyValue`), so this is a
  field rename with no per-pair transform needed — `ValueInfo.valueSystemId`
  is already populated by the backend response itself, not derived
  client-side the way `fetchKeyValues`'s result is (§9.1 below).
- **Reused, not duplicated**: `transformValueDefinition` (already imported
  from `module-configurator-view/ui/calibration-keys/ckv.mapper.ts`) maps
  `ValueDefinitionDto[]` → `KeyValue[]` for `fetchKeyValues`'s result — the
  same function Calibration Keys already uses for its nested values, so no
  new value-mapping logic is introduced.

### 9.2 `SubgraphKeyVectorConfigPanel` changes

- **New prop `subgraphSystemId: string`** (D6, §4) — passed by the widget
  layer alongside the existing `subgraphId: number` prop. Used only to call
  `fetchPersistedKeyVectors` (§7.5); never used as a `kvSelectionsById` or
  `addKeyVector` key, which continue to use the stringified numeric
  `subgraphId` unchanged (D6 — this design does not touch that existing
  keying, only adds a correctly-identified new fetch alongside it).
- **On mount / `subgraphId` change** — calls
  `fetchPersistedKeyVectors(projectId, subgraphId, subgraphSystemId)` once
  (§7.5, §8 step 0). Not tied to `handleAddClick` or the Add-flow panel's
  open/close state.
- **`handleAddClick`** — calls `fetchGraphKeys(projectId)` in addition to
  its existing state resets (`showKeysList`, `searchTerm`, `selectedKeys`,
  `selectedValues`, `expandedKeys`). Per row 19, there is no
  `handleEditClick` — Edit no longer exists for this flow.
- **Keys list rendering** — iterates `availableGraphKeys` (id/name only),
  driven by `keysLoadState` (`'loading'` → list-level spinner, `'error'` →
  inline error + retry, otherwise the list). The existing main
  `ArcSearchBar` (row 26) filters this list by id/name only — no value
  matching, since values aren't loaded until a key is checked.
- **Checkbox `onChange`** — checking a key calls
  `fetchKeyValues(projectId, key.id)`. Unchecking does not eagerly clear
  `keyValuesState[key.id]` — the next check simply overwrites it via the
  always-refetch behavior (§7.4), so no separate uncheck handler logic is
  needed.
- **Select All** (row 27) — for each visible/filtered key not yet checked:
  check it and call `fetchKeyValues`. Fired as a plain loop (not
  `Promise.all`) since each key's row updates independently via the store's
  per-key map as its own request resolves.
- **Merged list for display** — a `useMemo` combines
  `persistedKvEntriesById[subgraphId] ?? []` (from `subgraph-config-store.ts`)
  with `kvSelectionsById[subgraphId] ?? []` (from the Graph Designer store)
  into the single array `AddedKeyVectorList` renders (§9.4, row 17). This is
  the one place the panel reads both stores together — everywhere else,
  each store's slice of state is used independently for its own concern
  (fetch vs. session-added rows).
- **Apply / Cancel** — Apply first checks
  `persistedKvLoadStateById[subgraphId] === 'loaded'` (row 29, §7.6); if
  not, shows an inline error and does nothing further (no validation, no
  `addKeyVector` call). Otherwise it reads `subgraphId` and the new
  `addKeyVector` action off the Graph Designer store (via
  `useGraphDesignerStoreShallow`), builds one `KeyValue[]` from all checked
  keys' selected values in local component state, runs the ≥1-pair
  validation (row 20), projects `persistedKvEntriesById[subgraphId] ?? []`
  to `KeyValue[][]` (one array per persisted entry's `keyValuePairs`), and
  on success calls `addKeyVector(String(subgraphId), keyValuePairs,
  persistedKeyValuePairs)` once — a cross-feature call replacing the old
  `addAddedKeyVector`/`addConfiguredKey` calls into
  `subgraph-config-store.ts`. The panel does not read `kvSelectionsById`
  itself or run its own duplicate comparison against either half (§7.6) —
  it branches only on `addKeyVector`'s boolean return: `false` shows the
  inline duplicate error (row 21) and leaves the current selection
  untouched; `true` means the append already happened. Both Apply (on a
  `true` return) and Cancel additionally call `clearKeyValuesState()`
  before closing the panel (Cancel always, per row 20's "always discard, no
  prompt"; Apply never calls it on a `false` return, since the panel stays
  open per row 21).
- **"Added Key Vector(s)" row checkboxes (row 18)** — rendered by the new
  `AddedKeyVectorList` (§9.4) across the merged list. For session-added
  rows, the checkbox toggles `KvSelection.selected` in
  `kvSelectionsById[subgraphId]` directly via a new
  `toggleKvSelection(subgraphId, index)` action (added alongside
  `addKeyVector` since nothing previously toggled it either — implied by
  `KvSelection.selected`'s existing use in `buildCreateUsecasesRequest`).
  For persisted rows, the checkbox is local UI state only (§9.4) — row 28's
  overlap-based default is deferred (D5), so this design defaults every
  persisted row's checkbox to checked, matching session-added rows'
  existing default, and the checkbox has no store action to call since
  toggling it can never affect `buildCreateUsecasesRequest` (row 17:
  persisted rows are excluded from that request regardless of checkbox
  state). Checking/unchecking a session-added row has no effect on
  `activeSubgraphs`'s membership beyond the `selected` filter (row 18) — it
  does not delete, reorder, or otherwise mutate the entry.

### 9.3 `GraphKeyRow` (new)

New file: `subgraph-configurator-view/ui/graph-key-row.tsx`. Extracted from
the parent panel to keep the ~800-line file from growing further. Owns:

- The key's checkbox and label (id, name).
- A local search-term state for filtering that key's values list (row 26's
  per-key search) — component-local, not store state.
- Rendering driven by `keyValuesState[key.id]?.status`: absent/unchecked →
  nothing; `'loading'` → spinner in place of the radio group; `'error'` →
  inline error + retry button (`onClick` re-invokes `fetchKeyValues`);
  `'loaded'` → the existing `RadioGroup`/`Radio` rendering, sourced from
  `keyValuesState[key.id].values` filtered by the local search term,
  instead of the old `key.values`.

Props: `keyInfo: Key`, `isChecked: boolean`, `selectedValueId?: number`,
`valuesEntry: KeyValuesEntry | undefined`, `onCheckChange`, `onValueSelect`,
`onRetryValues`. Purely presentational plus local search state — no direct
store access, consistent with the rest of the view layer reading store state
in the parent panel and passing it down as props.

### 9.4 `AddedKeyVectorList` (new)

New file: `subgraph-configurator-view/ui/added-key-vector-list.tsx`.
Extracted from the parent panel to isolate the cross-feature read from
`kvSelectionsById` (§3) and the persisted-entries read from
`subgraph-config-store.ts` from each other and from the Add-flow panel's own
concerns — the parent panel merges both (§9.2) and passes the combined array
down as a single prop, so this component itself has no cross-feature or
cross-store awareness. Renders the full merged list (row 17, both halves).
Owns:

- Rendering one row per entry in the merged list, formatted as
  `[KeyName:ValueName]` per pair joined per row (matching the legacy
  reference format cited in requirements §4.1.1, e.g.
  `[StreamRX:PCM_Deep_Buffer][Instance:Instance_1]`), regardless of whether
  the entry is persisted or session-added.
- Each row's checkbox. For session-added rows (`KvSelection`), bound to
  `selected` and calling `onToggleSelected(index)` → `toggleKvSelection`
  (§9.2) — selection-only, no other effect (row 18). For persisted rows
  (`PersistedKvEntry`), bound to local component state only, defaulting to
  checked (§9.2) — there is no store field for a persisted row's checked
  state in this design (row 28 deferred, D5), so toggling it is purely
  cosmetic and is lost if the component unmounts.
- The panel remains visible with an empty list and no separate zero-state
  message when the merged list is empty (row 17) — the "+" that opens the
  Add flow is rendered by the parent panel regardless of list length.
- No edit or delete affordance on any row, persisted or session-added (row
  19) — this component renders read-only rows plus a checkbox; it does not
  accept an `onEdit`/`onDelete` prop.
- A retry affordance shown in place of the persisted-entries portion of the
  list when `persistedKvLoadStateById[subgraphId] === 'error'` (§10) — this
  is the only way a failed persisted-entries fetch can be retried, since it
  is not tied to the Add-flow panel's own retry-by-reopening pattern (§7.5).

Props: `entries: Array<{origin: 'persisted' | 'session'; keyValuePairs:
KeyValue[]; selected: boolean}>`, `persistedLoadState: 'idle' | 'loading' |
'loaded' | 'error'`, `onToggleSelected: (index: number) => void`,
`onRetryPersisted: () => void`. Purely presentational — the parent panel is
the one reading and merging `kvSelectionsById[subgraphId]` and
`persistedKvEntriesById[subgraphId]`, tagging each entry with its `origin`
before passing the combined array down, consistent with `GraphKeyRow`'s
prop-driven pattern (§9.3). `origin` exists so the component can apply the
right checkbox behavior (store-backed vs. local-only) per row without
re-deriving it from entry shape.

---

## 10. Error Handling

| Scenario                              | Behavior                                                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchGraphKeys` fails                | `keysLoadState: 'error'`; panel shows an inline error in place of the keys list with a retry button that re-invokes `fetchGraphKeys`. No keys are selectable until retried successfully.                                                   |
| `fetchKeyValues` fails for one key    | That key's row shows an inline error + retry button (re-invokes `fetchKeyValues` for that key only). Other keys' checkboxes, loading, and loaded states are unaffected — failures do not block or cancel other in-flight fetches (row 25). |
| Select All triggers multiple failures | Each failed key shows its own retry independently; successfully-loaded keys are unaffected and remain expanded with their values.                                                                                                          |
| `fetchPersistedKeyVectors` fails      | `persistedKvLoadStateById[subgraphId]: 'error'`; `AddedKeyVectorList` shows an inline error + retry in place of the persisted-entries portion of the merged list (§9.4), independent of whether the Add-flow panel is open. Apply is blocked for this subgraph (row 29) until retried successfully — this is the same `'error'` state that trips the Apply gate, not a separate condition. |
| Apply clicked while persisted entries are loading/not-yet-fetched/errored | Row 29: `persistedKvLoadStateById[subgraphId] !== 'loaded'` — panel shows an inline error (e.g. "Existing key vectors are still loading — please wait") and does not run any further validation or call `addKeyVector`. The current selection stays intact. |
| Duplicate key vector on Apply         | `addKeyVector` runs its internal check against both `kvSelectionsById[subgraphId]` and the persisted list and returns `false` without mutating `kvSelectionsById` if either matches; the panel shows an inline error (row 21); the current selection stays intact so the user can adjust it. |

---

## 11. QUI Component Mapping

No new QUI component types are introduced beyond what `SubgraphKeyVectorConfigPanel`
already uses:

| Element                                | QUI component                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| List-level / per-key loading indicator | Existing spinner primitive used elsewhere in the panel (no new dependency)                               |
| Retry affordance                       | `Button` (`variant="ghost"`, small), consistent with existing icon-button usage in this panel            |
| Values radio group                     | `RadioGroup`/`Radio` from `@qualcomm-ui/react/radio` — unchanged from current implementation             |
| Checkboxes                             | `Checkbox` from `@qualcomm-ui/react/checkbox` — unchanged, now also used per-row in `AddedKeyVectorList` |
| Search inputs                          | `ArcSearchBar` from `~shared/controls` — unchanged, now used twice (keys list + per-key) instead of once |

---

## 12. Design Decisions and Invariants

**D1 — Backend dependency, no fallback.** The current backend contract
(`GET /projects/{projectId}/definitions/keys`) always returns every key with
its values fully nested — there is no "keys only" or "values for key X"
variant anywhere in the existing API surface (confirmed by codebase
investigation: no per-key or keys-only endpoint exists in any `entities/`
client). This design requires **three new backend endpoints**:

- `GET /projects/{projectId}/definitions/graph-keys`
- `GET /projects/{projectId}/definitions/graph-keys/{keyId}/values`
- `GET /projects/{projectId}/subgraphs/{subgraphSystemId}/key-vector-config`
  (§6, §7.5 — persisted Added Key Vector(s), needed to satisfy row 21's
  duplicate check across the full merged list; see D5 for why this could
  not be deferred once "avoid duplicates at any cost" was the accepted
  bar)

Frontend implementation cannot be completed end-to-end until these exist;
frontend work can proceed against a mock/stub of these endpoints in the
interim. No client-side fallback (e.g. simulating the two-step fetch UX
against the existing single-call payload) is planned — the three endpoints
are a hard prerequisite. Persisting `kvSelectionsById` beyond the existing
create-usecases Apply flow is out of scope for this design (see §1) and
introduces no additional backend dependency here.

**D2 — Added Key Vector(s) storage moves to a cross-feature dependency,
deliberately.** `subgraph-config-store.ts` lives in the `key-configurator`
feature; `kvSelectionsById` lives in the `graph-designer` feature's
edit-session slice, and is the map `buildCreateUsecasesRequest` already
reads for the whole-session Apply request. Keeping "Added Key Vector(s)" in
`subgraph-config-store.ts` (as originally shaped in the superseded version
of this design, with `addedKeyVectors`/`addAddedKeyVector`) would have left
two disconnected representations of the same user action — the panel's
local list and the Apply request's actual source of truth — requiring an
explicit sync step that nothing in the codebase currently performs (§7.1).
Routing `addKeyVector` directly into `kvSelectionsById` instead means the
panel's "Added Key Vector(s)" list and the create-usecases request read the
exact same array; there is no second copy to keep in sync. The cost is a
cross-feature import: `subgraph-key-vector-config-panel.tsx` (in
`features/key-configurator`) now calls `useGraphDesignerStoreShallow` (from
`features/graph-designer`), which the `key-configurator` feature did not
previously depend on. This mirrors an existing precedent —
`features/graph-designer/hooks/use-key-configurator.ts` already reads
`isEditable`/`initializeConfiguration`/etc. off the Graph Designer store
for the `key-config-slice.ts` piece of key-configurator state — so a
key-configurator view component reading Graph-Designer-store state is not a
new pattern, only a new direction (view-layer reading directly, rather than
via a dedicated hook) for this specific slice.

**D3 — `KvSelection.systemId` is client-generated for user-added rows, not a
backend identifier.** The type's doc comment ("a whole Key+Value combination
offered as a unit") predates this design and describes selections sourced
from the backend (e.g. subgraph-pair-link-offered combinations); it does not
describe a user-composed "Added Key Vector." `addKeyVector` generates
`systemId` via `crypto.randomUUID()` purely so `AddedKeyVectorList` (§9.4)
has a stable React key and so the duplicate check (§7.6) has a row identity
distinct from array index (which would shift if a future change ever allowed
removal). It is never read by `buildCreateUsecasesRequest`, which projects
only `keyValuePairs[].valueInfo.valueSystemId` — so no wire contract depends
on this value's format or uniqueness scheme.

**D4 — Closing the "orphaned store" gap.** Before this design,
`configuredKeyValues` in `subgraph-config-store.ts` was written by the Add
panel's Apply handler but read by nothing outside that same store/panel —
not by `buildCreateUsecasesRequest`, not by any backend call. A user could
complete the entire Add flow and have it have zero effect on the actual
Apply request that reaches the backend. This design closes that gap
structurally: `addKeyVector` writes to the one map
(`kvSelectionsById`) that `buildCreateUsecasesRequest` already reads, so
there is no longer a code path where the Add flow's result is disconnected
from Apply.

**D5 — Backend-persisted Added Key Vector(s): row 17 and row 21 are
implemented; row 28 remains deferred; and where the trust boundary sits.**
An earlier revision of this design deferred all three of row 17's merged
list, row 21's full duplicate check, and row 28's overlap-based checked
state — on the premise that a session-added row duplicating a persisted one
undetected was an acceptable interim gap. That premise was withdrawn:
duplicates must be avoided unconditionally, not "until a follow-up design
lands." This revision closes row 17 and row 21 in full (§7.5, §7.6, §9.2,
§9.4) via a third backend endpoint (D1) and a new
`persistedKvEntriesById`/`persistedKvLoadStateById` pair in
`subgraph-config-store.ts` (§7.2). Row 28 (the overlap-based default
checked state for persisted rows, computed against currently-selected
usecases' combined `keyValueCollection`) remains deferred — it is a
narrower, purely-cosmetic gap (a persisted row's checkbox default, not
whether duplicates are prevented) with its own independent scope (locating
and reading "currently-selected usecases," per-row overlap counting,
tie-breaking) that does not block row 21's guarantee, so it was kept out
rather than expanding this revision further. §9.2/§9.4 use a checked-by-
default placeholder for persisted rows in its place.

**Where persisted entries live, and the resulting trust boundary.**
Persisted entries are fetched and held in `subgraph-config-store.ts`
(key-configurator feature), not in `edit-session-slice.ts` alongside
`kvSelectionsById` — the panel already reads both stores and is the natural
place to merge them for display (§9.2, §9.4), and mirroring the data into a
second graph-designer field would recreate exactly the "two representations
of the same thing" problem D2 rejected, just one layer further in. The
consequence: `addKeyVector`'s duplicate check is *not* fully self-contained
the way its `kvSelectionsById` half is (I6) — the persisted half depends on
the panel supplying a current, correctly-fetched list as a parameter
(§7.3, §7.6). This is a deliberate, narrow exception to I6's "no caller can
weaken this" property, and it is why row 29's Apply gate exists: the panel
is required to verify `persistedKvLoadStateById[subgraphId] === 'loaded'`
before it is allowed to call `addKeyVector` at all (§7.6, §9.2), so the one
input `addKeyVector` must trust is never trusted while stale, missing, or
failed. Anyone changing how persisted entries are fetched or stored must
preserve this gate — removing it without an equivalent guarantee would
silently reopen the exact hole this revision closes.

**D6 — The new persisted-entries fetch uses the subgraph's real `systemId`,
not the stringified numeric id `kvSelectionsById` uses.** Codebase
investigation surfaced that `kvSelectionsById`/`addKeyVector`'s existing
string key is `String(subgraphId)` — a stringified *numeric* id — and that
`buildCreateUsecasesRequest` (pre-existing, unmodified by this design) sends
that same value as `SubgraphKvSelectionDto.systemId` on the wire. Elsewhere
in this codebase (`SubgraphPairDto`, `SpfModuleDto`, `SubsystemDto`,
`graph-data-slice.ts`'s explicit `numericIdToSystemId` map), a numeric `id`
and a real backend `systemId` are distinct, non-derivable values — this
existing code's `String(numericId)` may itself be sending the wrong
identifier to the backend today. That is a pre-existing issue, outside this
design's scope (it predates this document and is orthogonal to duplicates),
and is **not** fixed here. What this design does do: it does not repeat the
mistake in new code. `getSubgraphConfig` (§6) and `fetchPersistedKeyVectors`
(§7.5) take a real `subgraphSystemId: string`, sourced from
`SubgraphConfigurationItem.systemId` (`configurator-item.types.ts`, already
present, just not previously threaded down to this panel) via one new prop
on `SubgraphKeyVectorConfigPanel` and one new pass-through in
`key-configurator-panel.tsx` (§4, §9.2). `persistedKvEntriesById`/
`persistedKvLoadStateById` are still keyed by the numeric `subgraphId`
(matching this store's other per-subgraph maps, §7.2) — only the outbound
API call uses `subgraphSystemId`; no map anywhere in this design is keyed by
it.

**I1 — No session-level value caching.** Every check of a key's checkbox
issues a fresh `fetchKeyValues` call, and `clearKeyValuesState()` wipes the
entire per-key cache on both Cancel and successful Apply. This holds even if
the same key is unchecked and rechecked multiple times within one Add-panel
session (row 24).

**I2 — Per-key fetch independence.** No fetch for one `keyId` reads or
mutates another `keyId`'s `keyValuesState` entry. A failure or slow response
for one key never blocks, cancels, or delays another key's fetch or
rendering (row 25).

**I3 — Scope boundary.** `availableKeys`/`GraphKey` (with nested values) as a
type and the mapper that builds it (`transformKeyDefinitionsToGraphKeys`)
are removed only from the Subgraph Key Vector data path. Calibration Key
Vector, Tag Key Vector, and Subsystem Keys keep consuming
`getAllKeyDefinitions`/`getAllTagDefinitions` unchanged; this design does
not touch their stores, views, or mappers.

**I4 — Each added key vector row is the atomic unit.** A single Apply always
produces exactly one new entry in `kvSelectionsById[subgraphId]` (row 17),
regardless of how many key-value pairs it contains. The duplicate check
(row 21) and the "no edit/delete" rule (row 19) both operate at the row
level, never at the level of an individual key-value pair within a row —
this holds for persisted rows too (§7.5, §9.4). Splitting or merging rows
after Apply is not supported — consistent with row 19's "add-only" model.
`toggleKvSelection` (§9.2) is the sole exception to "no mutation of an
existing row" for session-added rows, and it only ever flips `selected` —
never `keyValuePairs` or `systemId`. Persisted rows have no store-backed
mutation at all (§9.4) — their checkbox is local-only display state.

**I5 — `addKeyVector` never issues a backend call.** It is a synchronous
`set()` against in-memory edit-session state, like every other
`edit-session-slice.ts` action. The only network call that ever transmits
`kvSelectionsById` is the pre-existing whole-session Apply
(`useApplyDiscard` → `createUsecases`), unmodified by this design.
`fetchPersistedKeyVectors` (§7.5) does issue a backend call, but it is a
`subgraph-config-store.ts` action, not an `edit-session-slice.ts` one — this
invariant is scoped to `addKeyVector` specifically, not to every action this
design introduces.

**I6 — The slice write and the store update are the same event; there is no
sync step between them, for the `kvSelectionsById` half.** `createEditSessionSlice`
is composed directly into the Graph Designer's Zustand store
(`graph-designer-store-context.ts`) — `kvSelectionsById` is not state that
lives in a separate "slice layer" and gets copied into "the store"
afterward; the slice's `set()` call *is* the store's state update, in the
same synchronous call stack as `addKeyVector` itself. Every component
reading `kvSelectionsById` via `useGraphDesignerStoreShallow` (e.g.
`AddedKeyVectorList`, §9.4) re-renders from that same update, in the same
commit — there is no intermediate state to go stale and no second write
path that could fall out of sync with the first. This is also why the
`kvSelectionsById` half of the duplicate check must live inside
`addKeyVector` (§7.6) rather than in the panel: the check and the mutation
share one `get()`/`set()` pair against one map, so there is exactly one
place where "is this a duplicate" and "what's currently in
`kvSelectionsById`" can disagree — inside `addKeyVector` itself, which is
the one function `addKeyVector` is supposed to get right. A future change
that introduces a second store or a copy of this data (e.g. to feed some
other view) would reintroduce the exact "orphaned store" failure mode D4
closes, and should be rejected on that basis rather than implemented as a
"sync" step. **This invariant does not extend to the persisted-entries
half** — see D5's "resulting trust boundary" for the one place this design
accepts a caller-supplied input instead, and why row 29's Apply gate is
this design's answer to that gap rather than a second self-contained field.

---

## 13. Testing Notes

New/changed unit test surface (extends, but does not replace, the existing
`SearchFiltersKeys`/`ExpandAllKeys`/etc. cases enumerated in requirements §6
"Unit Tests — Subgraph Keys Configuration"):

- `fetchGraphKeys` — success populates `availableGraphKeys`; failure sets
  `keysLoadState: 'error'`; called on every Add-panel open (no memoization
  guard).
- `fetchKeyValues` — success populates `keyValuesState[keyId]`; failure sets
  `status: 'error'`; called on every checkbox check including recheck after
  uncheck (no skip-if-loaded guard); concurrent calls for different `keyId`s
  do not interfere with each other's state.
- `clearKeyValuesState` — resets the map to `{}`; called by the panel on
  both Cancel and successful Apply.
- `fetchPersistedKeyVectors` (in `subgraph-config-store.test.ts`) — success
  populates `persistedKvEntriesById[subgraphId]` via
  `transformSgkvDtosToPersistedKvEntries` and sets
  `persistedKvLoadStateById[subgraphId]: 'loaded'`; failure sets `'error'`
  and leaves `persistedKvEntriesById[subgraphId]` unset; calls
  `getSubgraphConfig` with `subgraphSystemId`, not the numeric `subgraphId`
  (D6 — guards against the identifier mix-up this design deliberately
  avoided); one subgraph's fetch does not affect another's
  `persistedKvLoadStateById` entry (mirrors I2's per-key independence
  pattern, §7.5).
- `GraphKeyRow` — renders spinner/error/loaded states correctly per
  `valuesEntry.status`; local search filters only that key's values; retry
  button re-invokes the fetch callback.
- Select All — checks all filtered keys and triggers one `fetchKeyValues`
  call per newly-checked key; a filtered subset (row 16 semantics via row
  26's keys-list search) only checks/fetches the visible keys.
- `addKeyVector` (in `edit-session-slice.test.ts`) — appends exactly one new
  `KvSelection` to `kvSelectionsById[subgraphId]` and returns `true` when the
  set matches neither an existing `kvSelectionsById[subgraphId]` entry nor
  any entry in the `persistedKeyValuePairs` parameter, regardless of how
  many pairs it contains; creates the array when the subgraph has no prior
  entries; defaults `selected: true`; never mutates existing entries on a
  successful append; never calls any API function. Returns `false` and
  performs **no** mutation (array reference and length unchanged) when the
  exact key+value set already exists in `kvSelectionsById[subgraphId]` —
  this is the case that guards against the `kvSelectionsById` half of the
  duplicate check being bypassable from any call site. **Also** returns
  `false` with no mutation when the exact set matches an entry in
  `persistedKeyValuePairs` even though `kvSelectionsById[subgraphId]` has no
  matching entry at all — this is the case that specifically guards row 21's
  "avoid duplicates at any cost" bar against the D5 gap this revision
  closes; a regression test should assert this scenario explicitly (empty
  `kvSelectionsById[subgraphId]`, non-empty matching `persistedKeyValuePairs`
  → `false`).
- Apply gate (row 29, in the panel's test suite) — Apply is blocked with an
  inline error and `addKeyVector` is never called when
  `persistedKvLoadStateById[subgraphId]` is `'idle'`, `'loading'`, or
  `'error'`; Apply proceeds normally (subject to the usual ≥1-pair and
  duplicate checks) only when it is `'loaded'`. Cover all three blocking
  states, not just one, since each has a different cause (never fetched,
  in flight, failed).
- Apply — a single Apply with N checked keys produces exactly one
  `kvSelectionsById[subgraphId]` entry containing N pairs, not N separate
  entries (guards against regressing to the old flat-list behavior); the
  resulting entry's `keyValuePairs[].valueInfo.valueSystemId` values are
  all non-empty (guards against D4's "orphaned store" gap reappearing); the
  panel shows the inline duplicate error and keeps its selection when
  `addKeyVector` returns `false`, and does not call `clearKeyValuesState()`
  in that case (row 21); the panel passes the current
  `persistedKvEntriesById[subgraphId]`, projected to `KeyValue[][]`, as
  `addKeyVector`'s third argument on every Apply call — a test asserting
  the call arguments (not just the return value) is required here, since an
  omitted or stale third argument would compile-fail only if the parameter
  type were accidentally made optional, not otherwise.
- Duplicate check — an exact-match row (same key IDs + value IDs,
  order-independent) against an existing session-added entry makes
  `addKeyVector` return `false` with no state change, verified directly
  against the slice (not only through the panel); the same for an
  exact-match row against a persisted entry (see the `addKeyVector` bullet
  above); a partial-overlap row against either half is accepted as a new
  entry and `addKeyVector` returns `true` (row 21).
- `toggleKvSelection` — flips only the targeted entry's `selected`; leaves
  `keyValuePairs`/`systemId` and every other entry untouched (row 18); has
  no effect on any persisted entry (persisted rows have no store-backed
  checkbox, §9.4).
- `AddedKeyVectorList` — renders one row per entry in the merged list
  (persisted + session-added) in `[Key:Value]` format, tagged with the
  correct `origin`; renders with an empty merged list (no zero-state
  message, "+" still available in the parent); has no edit/delete
  affordance on any row, persisted or session-added (row 19); shows the
  persisted-entries retry affordance when `persistedLoadState === 'error'`
  and calls `onRetryPersisted` on click; a persisted row's checkbox toggles
  local-only state with no call to any store action.
- `buildCreateUsecasesRequest` (existing, extended) — a `KvSelection` added
  via `addKeyVector` and then included/excluded by `toggleKvSelection`
  round-trips correctly into/out of `activeSubgraphs[].valueSystemIds`;
  persisted entries are never present in the built request regardless of
  their local checkbox state (row 17: display-only, excluded entirely).
