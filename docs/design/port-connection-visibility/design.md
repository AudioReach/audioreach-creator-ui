# Port Connection Visibility — Low-Level Design

> Requirements: [requirements.md](requirements.md)

---

## User interaction and design

**Port coloring** — On
graph load, each module port's fill color reflects how fully its
`activeLinks` cover its backend-known `totalLinksAtPort` —

- **`totalLinks === 0`** → `--color-background-neutral-00`.
- **`activeLinks <= totalLinks`** (and `totalLinks > 0`) →
  `--color-background-neutral-10`.
- **`activeLinks < totalLinks`** → `--color-background-neutral-06`.

Each token resolves automatically to the correct color for the active QUI
theme (light or dark) — no separate dark-mode mapping is needed. Only the
port's fill changes; the border stays the existing fixed
`--color-border-neutral-10`. `SubsystemNode`/`SubgraphProxyNode` ports are
visually unchanged.

**Port Connections Information popup:**

1. User right-clicks a module port that is partially covered
   (`activeLinks < totalLinks`, i.e. the neutral-06 token). The context
   menu shows **"Show all connections"** (omitted otherwise: no
   connections at all, or every backend-known connection is already
   represented on canvas).
2. Clicking it fetches that port's connections **before** any popup
   renders. While this first fetch is in flight, a full-screen blurred
   overlay (matching `editor-shell.tsx`'s "Saving…" pattern —
   `ProgressRing` + label, `z-[9999]`) shows a "Loading connections…"
   label; the graph designer is otherwise inert.
3. If the fetch fails, the overlay disappears, no popup ever opens, and
   a toast (`showToast(message, 'danger')`) reports the failure.
4. If the fetch succeeds, the **Port Connections Information** modal
   opens — blocking interaction with the rest of the graph designer —
   already showing the fetched rows, and immediately starts the second,
   batched other-end-module-lookup fetch. While that second fetch is in
   flight, the table/checklist area shows a loading indicator in its
   place. If it fails, an inline error message replaces the table and
   Add/Navigate are disabled (Cancel remains enabled).
5. Once both fetches succeed, the table lists one row per connection at
   that port: Port Id, Module Name, and Connection Type by default (other
   end, resolved via the batched module lookup). Exactly one row can be
   selected at a time; selecting a row shows that row's checklist of
   usecases, preserving whatever was already checked for other rows. An
   **Advanced details** switch, off by default, additionally reveals
   Module Id and Subgraph Id columns (resolved via the batched module
   lookup and the graph designer's subgraph-list lookup, respectively);
   toggling it never re-fetches and never affects row selection or
   checklist state.
6. A segmented control (**All / Subgraph / Dangling**) narrows the
   visible rows without a new fetch; the search box filters by
   `sg:`/`iid:`/`mod:` prefix or a plain substring against Module Name,
   also without a new fetch — matching still applies to Subgraph Id and
   Module Id even while the Advanced details switch is off and their
   columns are hidden. Neither the filter, the search box, nor the
   Advanced details switch ever clears row selection or the checklist —
   they only change which rows/columns are visible.
7. The user checks zero or more usecases per row (individually, or via
   select-all/deselect-all), then clicks one of:
   - **Add to selected usecases** — merges the checked, formatted
     usecases accumulated across all reviewed rows into the graph's
     existing selection.
   - **Navigate to selected usecases** — replaces the graph's existing
     selection with just those checked usecases.
   - **Cancel** — closes without any state change.
8. Add is enabled whenever the popup is in the ready state.
   Navigate is enabled only when the visualizer is in Readonly mode and the
   popup is in the ready state. Both Add and Navigate are disabled while data
   is loading or when an error occurs. In Edit mode, Navigate is disabled,
   but Add remains available when the popup is ready.

**Popup layout:**

```
┌─ Port Connections Information ────────────────────────────────────────┐
│                                                                        │
│  ┌─ sg: / iid: / mod: / text ─┐ ┌─ All ─┬─Subgraph─┬─Dangling─┐  Advanced│
│  └───────────────────────────┘ └───────┴──────────┴──────────┘  details │
│    search box                    connections-filter.tsx          [○──] │
│                                                                        │
│   search box, segmented control, and Advanced-details toggle are all   │
│   local-only — no re-fetch, never clear row selection/checklist (I2)   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ ○  Port Id   Module Name   Connection Type                       │ │
│  │ ●  Port Id   Module Name   Connection Type   ← selected row       │ │
│  │ ○  Port Id   Module Name   Connection Type                       │ │
│  │      (+ Module Id, Subgraph Id columns when Advanced is on)      │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│   connections-table.tsx — exactly one row selected at a time           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Usecases for selected row          [Select all]  [Deselect all]  │ │
│  │ ☑ usecase-1   ☐ usecase-2   ☑ usecase-3   ...                    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│   usecase-checklist.tsx — checkedUsecasesByRow persists per row (I6)   │
│                                                                        │
│  ┌─Add to selected usecases─┐ ┌─Navigate to selected usecases─┐ ┌Cancel┐│
│  └───────────────────────────┘ └───────────────────────────────┘ └─────┘│
│   enabled: ready                enabled: Readonly && ready      always │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### Front-End Interfaces

**`usecase-component.dto.ts`** — `ControlPortDto` gains a field, matching
`DataPortDto`:

```ts
export interface ControlPortDto {
  changeInfo: ChangeInfoDto;
  controlPortName: string;
  id: number;
  intents: ControlPortIntentDto[];
  name: string;
  portType: PortType;
  relatedEndPointLinks: EndPointLink[];
  systemId: string;
  totalLinksAtPort: number;
}
```

**`graph-data-slice.ts`** — the module-scoped intermediate `Port` type
gains `activeLinks` and `portSystemId`; its existing `portId` field is
corrected to hold the numeric-derived id instead of the systemId it
confusingly held before. `totalLinksAtPort` keeps its existing name here
— it is not renamed, so `toModuleInstance` and `withAdjustedPort` (the
edit-session mutation-reconciliation code in
`adjustModuleInstancesForLink`/`adjustSurvivingPortCounts`) need no
change beyond what's described below:

```ts
export interface Port {
  activeLinks: number;
  direction: 'input' | 'output';
  isStatic: boolean;
  portId: string;
  portName: string;
  portSystemId: string;
  portType: 'control' | 'data';
  totalLinksAtPort: number;
}
```

`activeLinksByPortId` is derived from `connections` in one pass, keyed by
the numeric-derived id space:

```ts
const activeLinksByPortId = new Map<string, number>();
for (const c of connections) {
  activeLinksByPortId.set(
    c.fromPortId,
    (activeLinksByPortId.get(c.fromPortId) ?? 0) + 1,
  );
  activeLinksByPortId.set(
    c.toPortId,
    (activeLinksByPortId.get(c.toPortId) ?? 0) + 1,
  );
}
```

`moduleInstances`'s port-mapping blocks now populate `portId`,
`portSystemId`, and `activeLinks` in addition to the existing
`totalLinksAtPort`, e.g. input data ports:

```ts
const inputPorts: Port[] = (m.dataPorts ?? [])
  .filter((p) => p.portIoType === 'Input')
  .map((p) => ({
    activeLinks: activeLinksByPortId.get(String(p.id)) ?? 0,
    direction: 'input' as const,
    isStatic: p.portType === 'Static',
    portId: String(p.id),
    portName: p.name,
    portSystemId: p.systemId,
    portType: 'data' as const,
    totalLinksAtPort: p.totalLinksAtPort ?? 0,
  }));
```

The view-model `Port` in `graph.types.ts` (below) is where the field is
actually named `totalLinks` — that rename happens once, at the
`level-view-adapter.ts` translation boundary, not in the intermediate
type above.

**`graph.types.ts`** — the view-model `Port` gains two optional fields:

```ts
export interface Port {
  activeLinks?: number;
  id: string;
  locked?: boolean;
  maxConnections?: number;
  name?: string;
  portIoType: PortIoType;
  portStatus?: PortStatus;
  totalLinks?: number;
}
```

**`usecase-component.dto.ts`** — new types for the popup, additive to the
existing `DataLinkDto`/`ControlLinkDto`. `sourceId`/`sourcePortId`/
`destinationId`/`destinationPortId` are typed `string` (systemIds):

```ts
interface DataLinkWithUsecasesLinkDto {
  changeId?: string;
  connectionType: ConnectionType;
  destinationId: string;
  destinationPortId: string;
  editType?: 'Added' | 'Removed' | 'Modified' | 'Unchanged';
  isDangling: boolean;
  relatedEndPointLinks: EndPointLink[];
  sourceId: string;
  sourcePortId: string;
  systemId: string;
}

interface ControlLinkWithUsecasesLinkDto {
  changeId?: string;
  connectionType: ConnectionType;
  destinationId: string;
  destinationPortId: string;
  editType?: 'Added' | 'Removed' | 'Modified' | 'Unchanged';
  isDangling: boolean;
  relatedEndPointLinks: EndPointLink[];
  sourceId: string;
  sourcePortId: string;
  systemId: string;
}

export interface DataLinkWithUsecasesDto {
  link: DataLinkWithUsecasesLinkDto;
  usecases: UsecaseDto[];
}

export interface ControlLinkWithUsecasesDto {
  link: ControlLinkWithUsecasesLinkDto;
  usecases: UsecaseDto[];
}
```

Also — the existing `SpfModuleDto.subgraphId` is corrected from `number`
to `string` (a systemId):

```ts
export interface SpfModuleDto {
  // ...existing fields unchanged...
  subgraphId: string; // was: number
}
```

**`model/port-connections-info.types.ts`** (new, in the feature slice):

```ts
export type ConnectionFilter = 'all' | 'sg' | 'dangling';

export interface ConnectionRow {
  connectionType: ConnectionType;
  isDangling: boolean;
  moduleId: string; // hex — from the batched module lookup's SpfModuleDto.id
  moduleName: string; // from the batched module lookup's SpfModuleDto.name
  otherModuleSystemId: string; // self/other-resolved; key into the batched lookup response
  otherPortId: string; // hex — resolved from the other module's dataPorts/controlPorts
  subgraphSystemId: string; // raw subgraph systemId — resolveSubgraphDisplay() resolves this to a display id at render time; always resolved regardless of the Advanced-details toggle, so `sg:` search keeps working while the column is hidden
  systemId: string; // link.systemId — row key
  usecases: UsecaseDto[];
}

export type PortConnectionsInfoState =
  | {status: 'closed'}
  | {componentSystemId: string; portSystemId: string; status: 'loading-links'}
  | {componentSystemId: string; portSystemId: string; status: 'loading-modules'}
  | {
      componentSystemId: string;
      portSystemId: string;
      rows: ConnectionRow[];
      status: 'ready';
    }
  | {
      componentSystemId: string;
      message: string;
      portSystemId: string;
      status: 'error';
    };
```

`'loading-links'` is the pre-open state — it drives the full-screen
overlay in `graph-designer.tsx`, not the popup. `'loading-modules'`,
`'ready'`, and `'error'` all mean the popup is already open (the first
fetch already succeeded); only `'error'` in this set corresponds to a
failure, since a `'loading-links'` failure never reaches this type at
all — it routes to `showToast` and back to `{status: 'closed'}` (see
`use-port-connections-info.ts` below).

### Back-end

#### API Design

No backend changes owned by port coloring. `ControlPortDto.totalLinksAtPort`
depends on the backend team shipping the corresponding API field in
parallel.

For the popup, two new functions mirror the existing
`getUsecasesWithFilter` query-param pattern:

```ts
export async function getDataLinkWithUsecases(
  projectId: string,
  componentSystemId: string,
  portSystemId: string,
): Promise<ApiResult<DataLinkWithUsecasesDto[]>> {
  const params = new URLSearchParams({componentSystemId, portSystemId});
  return httpClient.get<DataLinkWithUsecasesDto[]>(
    `/projects/${projectId}/usecases/data-link?${params.toString()}`,
  );
}

export async function getControlLinkWithUsecases(
  projectId: string,
  componentSystemId: string,
  portSystemId: string,
): Promise<ApiResult<ControlLinkWithUsecasesDto[]>> {
  const params = new URLSearchParams({componentSystemId, portSystemId});
  return httpClient.get<ControlLinkWithUsecasesDto[]>(
    `/projects/${projectId}/usecases/control-link?${params.toString()}`,
  );
}
```

- Endpoint: `GET /arc-api/v1/projects/{projectId}/usecases/data-link`
  Query: `componentSystemId`, `portSystemId`
  Response: `DataLinkWithUsecasesDto[]`
- Endpoint: `GET /arc-api/v1/projects/{projectId}/usecases/control-link`
  Query: `componentSystemId`, `portSystemId`
  Response: `ControlLinkWithUsecasesDto[]`

A third new function, the batched other-end module lookup, mirrors the
request shape of `entities/spf-module-data`'s existing
`queryModuleIndices` but is kept entirely separate:

```ts
export async function getModulesBySystemIds(
  projectId: string,
  systemIds: string[],
): Promise<ApiResult<SpfModuleDto[]>> {
  return httpClient.post<SpfModuleDto[]>(
    `/projects/${projectId}/spf-modules/query`,
    {systemIds},
  );
}
```

- Endpoint: `POST /arc-api/v1/projects/{projectId}/spf-modules/query`
  Body: `{systemIds: string[]}`
  Response: `SpfModuleDto[]` (the existing `entities/usecases` type)

All three exported from `entities/usecases/index.ts`.

#### Database Design

Not applicable — frontend-only change; no new persistence.

### Interfaces, Services

**`port-geometry.ts`** — new pure function alongside `portStatusClass`:

```ts
const PORT_FILL_TOKENS = {
  FULLY_COVERED: 'bg-[var(--color-background-neutral-10)]',
  NONE: 'bg-[var(--color-background-neutral-00)]',
  PARTIALLY_COVERED: 'bg-[var(--color-background-neutral-06)]',
} as const;

export function portFillClass(port: Port): string {
  const total = port.totalLinks ?? 0;
  const active = port.activeLinks ?? 0;
  if (total === 0) return PORT_FILL_TOKENS.NONE;
  if (active >= total) return PORT_FILL_TOKENS.FULLY_COVERED;
  return PORT_FILL_TOKENS.PARTIALLY_COVERED;
}
```

`active >= total` (rather than strict `===`) keeps this function total
and defensive: even if `activeLinks` ever transiently exceeds
`totalLinks` (an invariant violation this design otherwise assumes won't
happen — see Assumptions in [requirements.md](requirements.md)), the port
still renders as fully covered instead of falling through to an
undefined state.

Border is intentionally not part of this function's contract — it never
varies with link count, so it stays a separate constant in
`port-handles.tsx`:

```ts
const HANDLE_BORDER_CLASS = 'port-handle border-[var(--color-border-neutral-10)]';
const FIXED_FILL_CLASS = 'bg-[var(--color-background-neutral-06)]';

interface PortHandlesProps {
  anchorHeight?: number;
  node: PortHandlesNode;
  showLinkCountColor?: boolean;
}

// inside anchors.map(...):
className={`${HANDLE_BORDER_CLASS} ${
  showLinkCountColor ? portFillClass(anchor.port) : FIXED_FILL_CLASS
} ${portStatusClass(anchor.port)}`.trim()}
```

`showLinkCountColor` is a caller-supplied gate rather than an inference
from `totalLinks`/`activeLinks` being present, because `PortHandles` is
shared by `ModuleNode`, `SubsystemNode`, and `SubgraphProxyNode`.
`module-node.tsx` passes the new prop; `subsystem-node.tsx`/
`subgraph-proxy-node.tsx` do not.

**Context-menu gate and pre-open loading overlay — `graph-designer.tsx`:**

```ts
const contextMenu = useMemo<VisualizerContextMenuConfig>(() => ({
  getItems: (target) => {
    if (target.kind !== 'port') return [];
    const activeLinks = target.port.activeLinks ?? 0;
    const totalLinks = target.port.totalLinks ?? 0;
    if (activeLinks >= totalLinks) return []; // fully covered, or no connections
    return [{id: 'show-all-connections', label: 'Show all connections'}];
  },
  onAction: (actionId, target) => {
    if (actionId === 'show-all-connections' && target.kind === 'port') {
      open(target.nodeId, target.port);
    }
  },
}), [open]);

const isPopupOpen =
  state.status === 'loading-modules' ||
  state.status === 'ready' ||
  state.status === 'error';

// Rendered alongside the existing isExpandCollapsePending overlay, same pattern:
{state.status === 'loading-links' &&
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm" ...>
      <ProgressRing />
      <span>Loading connections…</span>
    </div>,
    document.body,
  )}
<PortConnectionsInfoPopup open={isPopupOpen} state={state} ... />
```

The gate compares `activeLinks` against `totalLinks` — port coloring's
own coverage rule, reused as the trigger. `target.nodeId`/`target.port.id`
are passed straight through — no additional resolution (Invariant I5).
Port type for endpoint selection comes from `target.port.portIoType`. The
popup itself only mounts as `open` once the first-stage fetch has already
succeeded — a `'loading-links'` failure never reaches it.

**`hooks/use-port-connections-info.ts`** — owns fetch/open/close state
across two sequential requests: the link-list fetch, then a batched
other-end module lookup. Only a successful first-stage fetch causes the
popup to open; a first-stage failure reports via toast and never opens
anything:

```ts
export function usePortConnectionsInfo(projectId: string): {
  close: () => void;
  open: (componentSystemId: string, port: Port) => void;
  state: PortConnectionsInfoState;
} {
  const [state, setState] = useState<PortConnectionsInfoState>({
    status: 'closed',
  });
  const requestIdRef = useRef(0);

  const open = useCallback(
    (componentSystemId: string, port: Port) => {
      const portSystemId = port.id;
      const requestId = ++requestIdRef.current;
      setState({componentSystemId, portSystemId, status: 'loading-links'});
      const fetchFn =
        port.portIoType === 'control'
          ? getControlLinkWithUsecases
          : getDataLinkWithUsecases;
      void fetchFn(projectId, componentSystemId, portSystemId).then(
        async (result) => {
          if (requestIdRef.current !== requestId) {
            return; // superseded by a later open() — discard this result
          }
          if (!result.success || !result.data) {
            showToast(result.message ?? 'Failed to load connections', 'danger');
            setState({status: 'closed'}); // stage-A failure never opens the popup
            return;
          }
          const links = result.data;
          const otherModuleSystemIds = [
            ...new Set(
              links.map(({link}) =>
                resolveOtherModuleSystemId(link, componentSystemId),
              ),
            ),
          ];
          setState({
            componentSystemId,
            portSystemId,
            status: 'loading-modules',
          }); // popup opens here
          const moduleResult = await getModulesBySystemIds(
            projectId,
            otherModuleSystemIds,
          );
          if (requestIdRef.current !== requestId) {
            return; // superseded while the second fetch was in flight
          }
          if (!moduleResult.success || !moduleResult.data) {
            setState({
              componentSystemId,
              message: moduleResult.message ?? 'Failed to load module info',
              portSystemId,
              status: 'error',
            });
            return;
          }
          const rows = buildConnectionRows(
            links,
            moduleResult.data,
            componentSystemId,
          );
          setState({componentSystemId, portSystemId, rows, status: 'ready'});
        },
      );
    },
    [projectId],
  );

  const close = useCallback(() => {
    requestIdRef.current += 1; // invalidate any in-flight fetch
    setState({status: 'closed'});
  }, []);

  return {close, open, state};
}
```

Exactly one link-list fetch and, only on its success, one batched
module-lookup fetch per `open()` call (Invariant I4). Filter/row-selection
changes never call `open` again, and never trigger either fetch.

**`lib/build-connection-rows.ts`** (pure functions):

```ts
function resolveOtherModuleSystemId(
  link: {destinationId: string; sourceId: string},
  selfModuleSystemId: string,
): string {
  return link.sourceId === selfModuleSystemId
    ? link.destinationId
    : link.sourceId;
}

function resolveOtherPortSystemId(
  link: {
    destinationId: string;
    destinationPortId: string;
    sourceId: string;
    sourcePortId: string;
  },
  selfModuleSystemId: string,
): string {
  return link.sourceId === selfModuleSystemId
    ? link.destinationPortId
    : link.sourcePortId;
}

function findOtherPortId(
  module: SpfModuleDto | undefined,
  otherPortSystemId: string,
): string {
  const port = [
    ...(module?.dataPorts ?? []),
    ...(module?.controlPorts ?? []),
  ].find((p) => p.systemId === otherPortSystemId);
  const id = port?.id;
  return id !== undefined
    ? (ConvertNumberToHexString(id) ?? String(id))
    : otherPortSystemId;
}

export function buildConnectionRows(
  dtos: Array<DataLinkWithUsecasesDto | ControlLinkWithUsecasesDto>,
  modules: SpfModuleDto[],
  selfModuleSystemId: string,
): ConnectionRow[] {
  const moduleBySystemId = new Map(modules.map((m) => [m.systemId, m]));
  return dtos.map(({link, usecases}) => {
    const otherModuleSystemId = resolveOtherModuleSystemId(
      link,
      selfModuleSystemId,
    );
    const otherPortSystemId = resolveOtherPortSystemId(
      link,
      selfModuleSystemId,
    );
    const otherModule = moduleBySystemId.get(otherModuleSystemId);
    return {
      connectionType: link.connectionType,
      isDangling: link.isDangling,
      moduleId: otherModule
        ? (ConvertNumberToHexString(otherModule.id) ?? String(otherModule.id))
        : otherModuleSystemId,
      moduleName: otherModule?.name ?? otherModuleSystemId,
      otherModuleSystemId,
      otherPortId: findOtherPortId(otherModule, otherPortSystemId),
      subgraphSystemId: otherModule?.subgraphId ?? '',
      systemId: link.systemId,
      usecases,
    };
  });
}
```

Self vs. other is resolved once per link, by comparing `sourceId`/
`destinationId` against `selfModuleSystemId` — the same comparison for
both data and control links. `moduleId`/`moduleName`/`otherPortId` come
from the batched module lookup's response — `moduleId`/`otherPortId` are
converted to hex via `ConvertNumberToHexString`, falling back to the raw
systemId string only if no module was found in the batched response.
`subgraphSystemId` here is still the module's raw subgraph _systemId_ (or
empty, if no module was found) — `graph-designer.tsx` resolves that to a
display id via its `resolveSubgraphDisplay` callback (passed down as a
prop), at render time; `buildConnectionRows` itself has no access to
`subgraphList`.

**`lib/filter-connection-rows.ts`** (pure function, client-side only,
Invariant I2):

```ts
export function filterConnectionRows(
  rows: ConnectionRow[],
  filter: ConnectionFilter,
): ConnectionRow[] {
  if (filter === 'sg') return rows.filter((r) => !r.isDangling);
  if (filter === 'dangling') return rows.filter((r) => r.isDangling);
  return rows;
}
```

`filter`, `selectedRowSystemId`, `checkedUsecasesByRow` (a
`Map<string, UsecaseDto[]>` keyed by row `systemId`), and
`showAdvancedDetails` (`boolean`, defaults `false`) are local `useState`
inside `port-connections-info-popup.tsx`. Changing the filter, search
term, or `showAdvancedDetails` never triggers a re-fetch, and never
clears `selectedRowSystemId` or `checkedUsecasesByRow` — even if the
selected row becomes hidden, its selection and checklist entry persist
untouched, so switching the filter back shows exactly what was there
before. The search box supports the same `sg:`/`iid:`/`mod:` prefixes
plus an unprefixed plain-substring match against Module Name — matching
against Subgraph Id/Module Id via `sg:`/`iid:` is unaffected by
`showAdvancedDetails`, since `filterConnectionRows`/the search matcher
operate on `ConnectionRow`, not on which columns are rendered — both
local-only.

**Component tree (`features/port-connections-info/`):**

```
ui/
  port-connections-info-popup.tsx   — Dialog.Root wrapper; owns filter,
                                       selectedRowSystemId,
                                       checkedUsecasesByRow, and
                                       showAdvancedDetails local state;
                                       composes the pieces below
  connections-table.tsx             — QUI Table, single-row select;
                                       Module Id/Subgraph Id columns
                                       conditional on showAdvancedDetails
  connections-filter.tsx            — QUI SegmentedControl
                                       (All / Subgraph / Dangling)
  advanced-details-toggle.tsx        — QUI Switch, off by default
  usecase-checklist.tsx             — Checkbox list for the selected
                                       row's usecases, with select-all/
                                       deselect-all
model/
  port-connections-info.types.ts    — ConnectionRow, ConnectionFilter,
                                       PortConnectionsInfoState
hooks/
  use-port-connections-info.ts      — fetch orchestration, open/close
lib/
  build-connection-rows.ts
  filter-connection-rows.ts
index.ts                            — exports PortConnectionsInfoPopup,
                                       usePortConnectionsInfo
```

**Props boundary — no feature-to-feature import.** `port-connections-info`
must not import from `features/graph-designer` (`setSelectedUsecases` and
`subgraphList` both live there) — per CLAUDE.md, features cannot import
other features directly. So `PortConnectionsInfoPopup` takes
`onAdd: (usecases: UsecaseDto[]) => void`,
`onNavigate: (usecases: UsecaseDto[]) => void`, and a plain
`resolveSubgraphDisplay: (subgraphSystemId: string) => string`
callback instead of importing `useGraphDesigner()`/`subgraphList` itself.
`graph-designer.tsx` formats via `formatUsecaseDisplay`, calls
`setSelectedUsecases`, and resolves the subgraph display id:

```ts
// graph-designer.tsx
const {selectedUsecases, setSelectedUsecases, subgraphList} = useGraphDesigner();
const subgraphBySystemId = useMemo(
  () => new Map(subgraphList.map((sg) => [sg.systemId, sg])),
  [subgraphList],
);

<PortConnectionsInfoPopup
  onAdd={(usecases) => {
    const formatted = usecases.map(formatUsecaseDisplay);
    setSelectedUsecases([...new Set([...selectedUsecases, ...formatted])]);
  }}
  onNavigate={(usecases) => {
    setSelectedUsecases(usecases.map(formatUsecaseDisplay));
  }}
  resolveSubgraphDisplay={(subgraphSystemId) => {
    const sg = subgraphBySystemId.get(subgraphSystemId);
    return sg?.subgraphId ?? subgraphSystemId;
  }}
  {/* ...other props */}
/>
```

**Add / Navigate / Cancel wiring (inside `port-connections-info-popup.tsx`):**

```ts
const isReady = state.status === 'ready';
const canMutateSelection = isReadonly && isReady;

{isReady && (
  <Button onClick={handleAdd}>
    Add to selected usecases
  </Button>
)}
{canMutateSelection && (
  <Button onClick={handleNavigate}>
    Navigate to selected usecases
  </Button>
)}
<Button onClick={handleCancel}>Cancel</Button>
```

`handleAdd`/`handleNavigate` flatten and dedupe (by usecase id) every
entry in `checkedUsecasesByRow` — not just the currently-selected row's —
call `onAdd`/`onNavigate` with the result, then call `onClose()`.
Formatting and merge-vs-replace into `selectedUsecases` happen in the
`graph-designer.tsx` callbacks above, not inside this feature.

### Error Handling

**Port coloring:**

- A missing `totalLinksAtPort` on either `DataPortDto` or `ControlPortDto`
  defaults `totalLinks` to `0`.
- A port with no matching entry in `activeLinksByPortId` defaults
  `activeLinks` to `0` — same as any other `Map.get` miss.
- `portFillClass` is a pure, total function with no possible runtime
  failure.

**Port Connections Information popup:**

- **Stage-A (link-list) fetch failure** — never reaches
  `state.status === 'error'`; the popup never opens.
  `showToast(message, 'danger')` reports the failure, and `state` returns
  straight to `{status: 'closed'}`.
- **Stage-B (batched module lookup) fetch failure** — the popup is
  already open at this point (stage A succeeded); `state.status ===
'error'` shows `state.message` inline in place of the table, and
  Add/Navigate are disabled (Cancel remains enabled).
- No partial/stale data is ever shown: `open()` always overwrites `state`
  with a fresh `loading-links` entry before the first request starts, and
  bumps `requestIdRef` so a slow previous request pair that resolves
  after the popup was reopened for a different port is discarded.
- A row whose other-end module systemId is missing from the batched
  lookup response is not an error — `moduleId`/`moduleName`/`otherPortId`
  fall back to the raw systemId string, and `subgraphSystemId` is left
  empty (the table renders `'—'` for Subgraph Id in this case, when the
  Advanced-details switch is on).

---

## Architectural Impacts

**Port coloring:**

- `entities/usecases/model/usecase-component.dto.ts` — `ControlPortDto`
  gains `totalLinksAtPort: number`, matching `DataPortDto`, which already
  carries this field.
- `features/graph-designer/model/graph-data-slice.ts`:
  - The intermediate `Port` interface's existing `portId` field —
    which today actually holds a port's `systemId` despite its name —
    is corrected: `portId` now holds `String(p.id)` (the port's actual
    numeric-derived id), and a new `portSystemId: string` field holds
    what `portId` used to hold. This split exists because
    `Connection.fromPortId`/`toPortId` are already populated from the
    numeric-derived `link.sourcePortId`/`destinationPortId` (see below),
    while `Port.portId` today holds the systemId — matching `activeLinks`
    against connections would otherwise require a systemId→numeric
    lookup map; correcting `portId` to hold the numeric id directly
    avoids that map entirely, at the cost of one field rename/split.
  - `activeLinks` for a port is computed by matching `Connection.
fromPortId`/`toPortId` directly against the new `portId` field.
  - **Construction order changes:** `connections` must now be built
    before `moduleInstances`, so `activeLinks` can be derived before
    ports are constructed.
  - New `activeLinksByPortId` map, derived from `connections` in a single
    pass.
  - The intermediate `Port` interface gains `activeLinks: number`. Every
    port-mapping block populates it inline with an explicit `?? 0`
    default, so no consumer of this intermediate type ever needs to
    null-check it. `totalLinksAtPort` keeps its existing name on this
    intermediate type — not renamed to `totalLinks` — so `toModuleInstance`
    and `withAdjustedPort` (read/written by
    `adjustModuleInstancesForLink`/`adjustSurvivingPortCounts` during
    edit-session mutation-response reconciliation) require no change.
- `widgets/graph-designer/lib/level-view-adapter.ts` — module-port
  mapping's existing `id: p.portId` becomes `id: p.portSystemId`, so the
  view-model `Port.id` continues to be the port's systemId, unchanged
  from today's actual behavior. The mapping also carries `activeLinks`
  through, and maps `totalLinksAtPort` to the view-model's `totalLinks` —
  this is the one place the field is renamed. Subsystem-port mapping is
  untouched.
- `entities/graph/model/graph.types.ts` — view-model `Port` gains
  `activeLinks?: number` and `totalLinks?: number`. Optional here, unlike
  the intermediate `Port` above, because this view-model type is shared
  with `SubsystemNode`/`SubgraphProxyNode` ports, which never populate
  these fields.
- `features/usecase-visualizer/lib/port-geometry.ts` — new pure function
  `portFillClass(port)`, comparing `activeLinks` against `totalLinks`.
- `features/usecase-visualizer/ui/node-types/port-handles.tsx` — applies
  `portFillClass` conditionally via a new `showLinkCountColor` prop.
- `features/usecase-visualizer/ui/node-types/module-node.tsx` — passes
  `showLinkCountColor`.

**Port Connections Information popup:**

- `entities/usecases/model/usecase-component.dto.ts`:
  - New `DataLinkWithUsecasesDto`/`ControlLinkWithUsecasesDto` types and
    their link-field interfaces (separate from, mirroring
    `DataLinkDto`/`ControlLinkDto`). `sourceId`/`sourcePortId`/
    `destinationId`/`destinationPortId` are `string` (systemIds).
  - `SpfModuleDto.subgraphId` corrected from `number` to `string`
    (systemId). Reused as-is (not a
    new type) as the response shape for the batched module lookup below.
- `entities/usecases/api/usecases-api.ts` — three new functions:
  `getDataLinkWithUsecases`, `getControlLinkWithUsecases`, and
  `getModulesBySystemIds` (batched other-end module lookup, `POST
/spf-modules/query`). The last is new and separate from
  `entities/spf-module-data`'s existing `queryModuleIndices`, whose
  response type is a deliberately partial `SpfModuleDto` owned by the
  cal-data/tag-data consumers — this design does not modify or reuse it.
- `entities/usecases/index.ts` — exports the two new DTOs and three new
  API functions.
- `entities/subgraph-definitions/model/subgraph-definition.dto.ts` —
  `SubgraphDto` gains `systemId: string`.
- `features/graph-designer/model/subgraph-list-slice.ts` —
  `SubgraphDefinition` gains `systemId: string`, populated from
  `dto.systemId` in `toSubgraphDefinition`.
- `widgets/graph-designer/ui/graph-designer.tsx` — becomes the first
  consumer of `UsecaseVisualizerProps.contextMenu`; owns
  `usePortConnectionsInfo`'s state and renders the full-screen loading
  overlay for the first-stage fetch plus `<PortConnectionsInfoPopup>`;
  reads `currentVisualizerMode` (external dependency, see Assumptions in
  [requirements.md](requirements.md)) for button gating; resolves a
  subgraph systemId → `SubgraphDefinition` lookup from its own
  `subgraphList` (`SubgraphListSlice`) and passes it down as a plain
  prop; owns the `onAdd`/`onNavigate` callbacks that call
  `useGraphDesigner()`'s `setSelectedUsecases` — required because
  `setSelectedUsecases` and `subgraphList` are exposed by
  `features/graph-designer`, and features must not import other features
  directly (CLAUDE.md).
- New feature slice `features/port-connections-info/` (`model/ui/lib/hooks`)
  — owns the popup, its fetch/open/close state (a two-step fetch: link
  list, then batched module lookup), row-mapping, and filtering. Exposes
  `onAdd`/`onNavigate` props carrying raw `UsecaseDto[]`; does not import
  from `features/graph-designer` or `features/usecase-selection`. Its
  self/other resolution does not depend on port type — one function
  serves both data and control links.
- Depends on port coloring's `Port.activeLinks`/`Port.totalLinks` fields
  (above), which must exist before this feature's context-menu gate can
  be implemented.

---

## Security Considerations

None beyond what the existing usecase API surface already requires. Port
coloring is a purely presentational mapping from existing numeric fields
and already-loaded connection data to a CSS class — no new inputs, no
network calls, no change to what is persisted or transmitted. For the
popup, no new input is user-authored beyond right-click target selection
(derived from already-loaded graph data, not free text);
`componentSystemId`/`portSystemId` are systemId strings already present
in loaded state, not user-entered. The search text input is a
client-side filter only — it never triggers a new request, so it carries
no injection surface into the API layer.

---

## Performance/Scalability Considerations

`activeLinksByPortId` derivation is a single O(n) pass over `connections`,
already loaded as part of `graphData`. `portFillClass` remains O(1) per
port. `buildConnectionRows`/`filterConnectionRows` are O(n) over the
fetched row count (bounded by the port's `totalLinks`, expected to be
small). The batched module lookup is one additional request per popup
open, sized by the number of _distinct_ other-end modules (deduplicated)
— not O(n) requests. No new render passes beyond React state updates
already implied by the existing render paths. The two-fetches-per-open
constraint (Invariant I4) means no risk of request storms from
filter/row interaction.

---

## Testing Strategy

**Unit — `portFillClass`:**

- `totalLinks: 0` → white token, regardless of `activeLinks`.
- `activeLinks === totalLinks` and `> 0` → black (fully-covered) token.
- `activeLinks < totalLinks` → gray (partially-covered) token.
- `activeLinks > totalLinks` (defensive case, invariant violated) →
  still resolves to the fully-covered token, not an undefined result.
- `totalLinks`/`activeLinks` both `undefined` → same result as both `0`.

**Unit — `graph-data-slice.ts`/`level-view-adapter.ts` mapping:**

- Intermediate `Port.portId` holds `String(p.id)`; `Port.portSystemId`
  holds `p.systemId` — distinct and not interchanged.
- `activeLinksByPortId` correctly counts connections per port `portId`.
- `totalLinksAtPort` present/absent → `totalLinks` carried through or
  defaults to `0`.
- Module view-model `Port.id` is populated from `Port.portSystemId`
  (not `portId`) — regression test for handle-id generation.
- `ModuleNode` (passes `showLinkCountColor`): handle fill class reflects
  `portFillClass(port)`. `SubsystemNode`/`SubgraphProxyNode` (no prop):
  handle fill class is always the fixed base color.

**Unit — `build-connection-rows.ts`:**

- `sourceId === componentSystemId` → other-end module systemId resolves
  from `destinationId`, other-end port systemId from `destinationPortId`.
  Reversed for `destinationId === componentSystemId`. Identical for
  `DataLinkWithUsecasesDto` and `ControlLinkWithUsecasesDto`.
- Other-end module systemId present in the batched lookup response →
  `moduleId`/`moduleName` resolve with `moduleId` hex-converted;
  `otherPortId` resolves by matching against `dataPorts`/`controlPorts`,
  also hex-converted.
- Other-end module systemId absent (lookup miss) → fall back to the raw
  systemId string; `subgraphSystemId` is empty.

**Unit — `filter-connection-rows.ts`:**

- `'all'` → all rows unchanged. `'sg'` → only `isDangling === false`.
  `'dangling'` → only `isDangling === true`.

**Unit — `use-port-connections-info.ts`:**

- `open()` with a data port calls `getDataLinkWithUsecases`, not
  `getControlLinkWithUsecases`; reversed for a control port.
- After the link-list fetch succeeds, `getModulesBySystemIds` is called
  exactly once with the deduplicated set of other-end module systemIds.
- `open()` transitions `closed → loading-links → loading-modules → ready`
  on full success.
- A stage-A (link-list) failure transitions back to `closed` and calls
  `showToast` with `'danger'` emphasis — it never reaches `'error'`.
- A stage-B (module-lookup) failure transitions `loading-modules →
error`, with the popup already open.
- A second `open()` call before the first's fetches resolve does not
  apply the first call's data to the second call's state (race guard).

**Unit — context-menu gate (`graph-designer.tsx`):**

- `getItems` returns the item only when `target.kind === 'port'` and
  `target.port.activeLinks < target.port.totalLinks`.
- `activeLinks === totalLinks` or `totalLinks` `undefined` → empty items.
- Non-port targets → empty items array.

**Unit — checklist persistence and filter non-destructiveness:**

- Checking a usecase for row A, then selecting row B, then reselecting
  row A shows row A's checkbox state unchanged — `checkedUsecasesByRow`
  is keyed per row, not reset on row switch.
- Applying a filter that hides the selected row leaves
  `selectedRowSystemId` and its checklist entry unchanged; only the
  visible rows shrink.

**Unit — Advanced-details toggle:**

- `showAdvancedDetails` defaults to `false` on a fresh `open()`, even if
  a prior popup session had toggled it to `true`.
- Toggling `showAdvancedDetails` renders/hides the Module Id and
  Subgraph Id columns without triggering `getModulesBySystemIds` or any
  other fetch, and without clearing `selectedRowSystemId` or
  `checkedUsecasesByRow`.
- Searching with `sg:`/`iid:` prefixes matches rows whether
  `showAdvancedDetails` is `true` or `false` — hiding the columns never
  changes `filterConnectionRows`/search-matcher behavior.

**Unit — Add/Navigate/Cancel handlers and `onAdd`/`onNavigate` callbacks:**

- Add/Navigate call `onAdd`/`onNavigate` with the deduplicated union of
  checked usecases across every row in `checkedUsecasesByRow` — not just
  the currently-selected row; an empty union is still a call, still
  closes the popup. Cancel calls neither. All three call `onClose`.
- `onAdd` merges formatted usecases into `selectedUsecases` without
  duplication; `onNavigate` replaces it entirely.

**Integration:**

- Selecting a different table row swaps which row's checklist is shown,
  without altering other rows' checked state. Applying a filter or
  search-box term that excludes the selected row does not clear row
  selection or the checklist.
- Button enablement: enabled only when Readonly **and** `status === 'ready'`.

**Not covered by this design's tests** — live increment/decrement
behavior and edit-session seed/reset (deferred, see Future Enhancements
in [requirements.md](requirements.md)); resolving OQ-5 once the
`currentVisualizerMode` read-back mechanism is confirmed.

---

## Open-Source Libraries

None added. Port coloring uses existing QUI design tokens
(`--color-background-neutral-00/06/10`). The popup uses existing QUI
components (`Dialog`, `SegmentedControl`, `Table`, `Checkbox`, `Button`).

---

## Invariants

**Port coloring:**

- A port's displayed color is always a pure function of its current
  `totalLinks` and `activeLinks`.
- `activeLinks` never exceeds `totalLinks`.
- Live counts, once seeded in an edit session, only change via explicit
  increment/decrement — never independently recomputed while active.
- Exiting or discarding an edit session clears all session-local live
  counts; the next edit session always reseeds from the latest
  `graphData`.

**Port Connections Information popup:**

- **I1 — Cancel never mutates state.** Closing the popup via Cancel never
  results in a call to `setSelectedUsecases`, and never issues any
  additional network request.
- **I2 — Filtering and column visibility are local and non-destructive.**
  Applying, changing, or removing a filter or search-box term, or
  toggling the Advanced-details switch, never triggers a new network
  request, and never clears row selection or checklist state — even if
  the selected row becomes hidden. The Advanced-details switch also never
  changes which rows match a filter or search term — it only changes
  which columns render.
- **I3 — Self is never derived from the link.** Self always comes from
  the query context (`componentSystemId`/`portSystemId`), never from
  comparing against the link's `sourceId`/`destinationId`.
- **I4 — Exactly two fetches per popup lifecycle, both triggered only by
  `open()`.** One data-link or control-link request, followed — only if
  it succeeds — by exactly one batched module-lookup request. A stage-A
  failure means the second fetch never fires and the popup never opens.
  Switching the filter, search term, or selected row never triggers
  another request of either kind.
- **I5 — `componentSystemId`/`portSystemId` resolution assumes a
  `ModuleNode` port.** This feature relies on the pre-existing invariant
  that `SubgraphProxyNode` boundary ports are always `locked: true` and
  therefore never reach the context-menu path. If that upstream
  invariant is ever relaxed, this feature must add an explicit
  node-kind guard.
- **I6 — Checklist state is never lost while the popup is open.** Checked
  usecases for any row, once set, persist until the popup closes or is
  reopened via a fresh `open()` — never cleared by switching rows,
  applying a filter, or a stage-B error.
