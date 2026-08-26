# Properties View: Design

> Requirements: [requirements.md](requirements.md)

---

## 1. Purpose

The Properties View is a reusable widget that renders property cards for the
currently selected Use Case Visualizer entities. It supports graph-designer
editing, schema-driven property trees, and row actions for virtual links.

The design uses the existing `widgets/properties-panel` scaffold as the target
widget boundary and the existing `features/generic-tree-view` as the renderer
for backend-defined schema properties.

---

## 2. Design Decision

Use **card-local Generic Tree View instances** for schema-property sections.

Each API-backed entity card owns its fetch, adapts the returned `PropertyDto[]`
to `TreeViewData`, and renders a hidden-toolbar `GenericTreeView` for the
schema-property area. Static graph-data fields remain ordinary `PropertyRow`
content in the card.

### Alternatives considered

| Option                                      | Outcome                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Card-local Generic Tree View                | Chosen. Keeps entity cards isolated, reuses the existing renderer, and fits the current widget scaffold. |
| Panel-level schema renderer                 | Rejected. Centralizes too much entity-specific behavior in `PropertiesPanel`.                            |
| New `features/properties-tree-view` wrapper | Deferred. Useful only if multiple non-panel consumers need the same property-tree adapter.               |

---

## 3. Architecture

### 3.1 FSD placement

```text
entities/
  subgraphs/api/
    fetch-subgraph-properties.ts
    patch-subgraph.ts
    patch-subgraph-properties.ts
  containers/api/
    fetch-container-properties.ts
    patch-container.ts
    patch-container-properties.ts
  modules/api/
    patch-module.ts
    fetch-module-properties.ts
    patch-module-properties.ts
  control-links/api/
    fetch-control-link-properties.ts
    patch-control-link-properties.ts
  subsystems/api/
    patch-subsystem.ts

widgets/properties-panel/
  lib/
    node-info.ts
    property-tree-adapter.ts
  model/
    use-module-card-data.ts
    use-subsystem-card-data.ts
    use-subgraph-card-data.ts
    use-container-card-data.ts
    use-data-link-card-data.ts
    use-control-link-card-data.ts
    use-virtual-data-link-card-data.ts
    use-virtual-control-link-card-data.ts
  ui/
    properties-panel.tsx
    entity-cards/
      module-properties-card.tsx
      subsystem-properties-card.tsx
      subgraph-properties-card.tsx
      container-properties-card.tsx
      data-link-properties-card.tsx
      control-link-properties-card.tsx
      virtual-data-link-properties-card.tsx
      virtual-control-link-properties-card.tsx
    shared/
      collapsible-card.tsx
      schema-properties-tree.tsx
  index.ts

shared/controls/
  copyable-id.tsx
  property-row.tsx

shared/store/tab-store-slices/
  properties-view-slice.ts
```

### 3.2 Layering rules

- `widgets/properties-panel` may import `features/generic-tree-view`,
  `entities/*` API clients, and shared UI/utilities.
- `features/generic-tree-view` remains domain-agnostic and receives only
  `TreeViewData`.
- Host tabs import `widgets/properties-panel`; the panel does not import host
  stores.
- Entity API modules do not import widgets or features.

---

## 4. Public Widget API

`PropertiesPanel` remains props-driven:

```typescript
interface PropertiesPanelProps {
  graphData: UsecaseGraphData;
  isEditing: boolean;
  onContainerIdChange(containerId: string, newId: string): void;
  onModuleAliasChange(moduleId: string, alias: string): void;
  onModuleContainerChange(moduleId: string, newContainerId: string): void;
  onModulePortCountChange(
    moduleId: string,
    field: 'maxControlPorts' | 'maxInputPorts' | 'maxOutputPorts',
    value: number,
  ): void;
  onNavigateToNode(nodeId: string): void;
  onSubgraphNameChange(id: string, name: string): void;
  onSubsystemNameChange(id: string, name: string): void;
  onVirtualDataLinkRowDelete(realDataLinkId: string): void;
  onVirtualControlLinkRowDelete(realControlLinkId: string): void;
  projectId: string;
  selectedEdges: SelectedEdgeRef[];
  selectedNodes: SelectedNodeRef[];
  virtualControlLinks?: ProxyControlLink[];
  virtualDataLinks?: ProxyDataLink[];
}
```

Delete callbacks are split by virtual-link type so direct Control Link cards do
not imply a standalone delete action.

Graph-data field cards own the backend PATCH. Host callbacks are store-update
notifications invoked only after the card PATCH succeeds; host adapters must
not issue a second entity PATCH from those callbacks.

---

## 5. Selection and Grouping

The Use Case Visualizer emits selected entity descriptors rather than parallel
raw ID arrays:

```typescript
interface SelectedNodeRef {
  id: string; // rendered ReactFlow node id
  nodeKind: NodeKind;
  systemId: string; // graph-data key for the selected entity
}

interface SelectedEdgeRef {
  edgeKind: EdgeKind;
  id: string; // rendered ReactFlow edge id
  systemId: string; // backing connection/proxy id for the selected entity
}
```

Graph-designer adapters populate `meta.systemId` on every `LevelView` node and
edge they create. The visualizer remains renderer-agnostic: it forwards this
metadata in `SelectionChangePayload` and does not know properties-panel entity
rules.

`PropertiesPanel` computes groups from `selectedNodes`, `selectedEdges`,
`graphData`, and virtual-link arrays. It renders only non-empty groups in this
order:

```text
Subgraphs -> Containers -> Modules -> Subsystems ->
Data Links -> Control Links -> Virtual Data Links -> Virtual Control Links
```

Cards inside each group preserve the order from `selectedNodes` or
`selectedEdges`.

If no supported selected entity resolves, the panel renders the empty state.
Group collapse state is widget-local and keyed by group type.

When resolving Virtual Data Link selections, the panel includes only proxy data
links present in the current effective level view's `virtualDataLinks` array.
Backend-discriminated subsystem proxy data links are not routed to the Virtual
Data Link group unless the current adapter exposes them as proxy links; otherwise
they remain standard Data Link selections and render the direct Data Link card.
Backend-discriminated subsystem proxy control links follow the same rule for the
Control Link card versus Virtual Control Link card.

---

## 6. Schema Properties Through Generic Tree View

### 6.1 Adapter

`property-tree-adapter.ts` adapts backend property payloads. For entities that
return `PropertyDto[]`, the adapter is direct:

```typescript
import type {
  ConfigElementDto,
  PropertyDto,
  PropertyElement,
} from '~shared/lib/property.dto';

function isConfigElement(e: PropertyElement): e is ConfigElementDto {
  return e.type === 'CONFIG_ELEMENT';
}

function collectConfigElements(
  elements: PropertyElement[],
): ConfigElementDto[] {
  return elements.flatMap((e) => {
    if (isConfigElement(e)) {
      return [e];
    }
    if (e.type === 'STRUCT') {
      return collectConfigElements(e.value);
    }
    return [
      ...collectConfigElements(e.template),
      ...collectConfigElements(e.value),
    ];
  });
}

function isPropertyHidden(p: PropertyDto): boolean {
  const configElements = collectConfigElements(p.elements);
  return (
    configElements.length > 0 &&
    configElements.every((e) => e.policy === 'HIDDEN')
  );
}

function propertyDtosToTreeViewData(
  systemId: string,
  properties: PropertyDto[],
  source: 'get' | 'set' = 'get',
): TreeViewData {
  return {
    items: properties.map((p) => ({
      elements: p.elements,
      id: String(p.propertyId),
      isHidden: isPropertyHidden(p),
      name: p.propertyName,
      systemId: p.systemId,
    })),
    source,
    systemId,
  };
}
```

The adapter is intentionally thin because `PropertyDto.elements` already uses
the same element union that Generic Tree View renders. Hidden and read-only
behavior remains owned by Generic Tree View.

Control-link properties may use a narrower response DTO for intents and heap.
If the endpoint does not return `PropertyDto[]`, add a sibling adapter that
projects the response into `TreeViewData` without changing Generic Tree View.

### 6.2 Reusable schema section

`SchemaPropertiesTree` wraps `GenericTreeView` with panel-specific defaults:

- `hideToolbar={true}`
- `defaultPolicyFilter={['BASIC', 'ADVANCED']}` so hidden-toolbar instances
  still render every backend-defined non-hidden schema property
- `readOnly={!isEditing}`
- `defaultViewMode="legacy"` for compact card rendering
- `autoCommit.onCommit` wired to the card's property PATCH handler
- loading, empty, and fetch-error states around the tree

### 6.3 Auto-commit payload

Generic Tree View emits dirty `TreeViewItem[]` through `autoCommit`. The card
converts those items into the backend property PATCH request. On success, the
card adapts the returned authoritative `PropertyDto[]` back into `TreeViewData`
with `source: 'set'` so Generic Tree View reconciles committed paths without a
full reset.

---

## 7. Entity Cards

### 7.1 Subgraph card

Static rows:

- Name: editable graph-data field. Save through `patchSubgraph`; on success
  call `onSubgraphNameChange`.
- Subgraph ID: `CopyableId`.

Schema section:

- Fetch `GET /projects/{projectId}/subgraphs/{subgraphId}/properties`.
- Render through `SchemaPropertiesTree`.
- PATCH changed schema items through `patchSubgraphProperties`.
- If Scenario ID changes successfully, re-fetch the full subgraph properties
  payload and replace the cached tree data.

### 7.2 Container card

Static rows:

- Container ID: editable graph-data field. Save through `patchContainer`; on
  success call `onContainerIdChange`.

Schema section:

- Fetch `GET /projects/{projectId}/containers/{containerId}/properties`.
- Render Container Type and backend-defined properties through
  `SchemaPropertiesTree`.
- Container Type options come from the property payload.
- PATCH changed schema items through `patchContainerProperties`.
- If Container Heap changes successfully, refresh module heap property data for
  modules in that container.

### 7.3 Module card

Static rows:

- Alias: editable when `isEditing`.
- Module ID and Instance ID: read-only `CopyableId`.
- Container ID: editable when `isEditing`.
- Max Input Ports: editable only if the module has at least one dynamic input
  data port; otherwise read-only.
- Max Output Ports: editable only if the module has at least one dynamic output
  data port; otherwise read-only.
- Max Control Ports: editable when `isEditing`.
- Input and Output Port tables: read-only.

Dynamic-port editability is derived from `module.inputPorts` and
`module.outputPorts` using `port.isStatic === false`.

### 7.4 Subsystem card

Static rows:

- Name: editable graph-data field. Save through `patchSubsystem`; on success
  call `onSubsystemNameChange`.
- Subsystem ID: `CopyableId`.

### 7.5 Data Link card

Read-only rows from `graphData.connections` and node lookup helpers:

- Source Component Info
- Source Port ID
- Destination Component Info
- Destination Port ID

### 7.6 Control Link card

Static rows:

- Peer1 Component Info
- Peer1 Port ID
- Peer2 Component Info
- Peer2 Port ID

Schema section:

- Fetch `GET /projects/{projectId}/control-links/{controlLinkId}/properties`.
- Render Allocated Intents, Supported Intents, and Heap ID from the returned
  control-link properties DTO.
- PATCH changes through `patchControlLinkProperties` once the backend update
  contract is available.

The direct Control Link card has no standalone delete action.

### 7.7 Standard Virtual Data Link card

For each real data link represented by the virtual link, render one row:

- Source module name and source ID/port.
- Destination module name and destination ID/port.
- Navigate to Source button -> `onNavigateToNode(sourceNodeId)`.
- Navigate to Destination button -> `onNavigateToNode(destNodeId)`.
- Delete button -> `onVirtualDataLinkRowDelete(realDataLinkId)`.

Deletes are available here because the represented real data links are not
rendered directly in the graph designer.

### 7.8 MDF Virtual Data Link card

Render:

- Read-only data link rows with source and destination details.
- Read-only modules list with module name, processing domain, and module ID.

No navigate or delete actions are rendered for MDF rows.

### 7.9 Virtual Control Link card

Render a scrollable list of contained real control links. Each row includes:

- Peer1 and Peer2 component info.
- Navigate to Peer1 button -> `onNavigateToNode(peer1NodeId)`.
- Navigate to Peer2 button -> `onNavigateToNode(peer2NodeId)`.
- Intents and Heap ID.
- Delete button -> `onVirtualControlLinkRowDelete(realControlLinkId)`.

The card has no wrapper-level delete action.

---

## 8. API Design

| Entity       | Operation               | Endpoint                                                               | Notes                                                                        |
| ------------ | ----------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Subgraph     | Fetch properties        | `GET /projects/{projectId}/subgraphs/{subgraphId}/properties`          | Returns `PropertyDto[]`.                                                     |
| Subgraph     | Patch name              | `PATCH /projects/{projectId}/subgraphs/{subgraphId}`                   | Updates graph-data field.                                                    |
| Subgraph     | Patch properties        | `PATCH /projects/{projectId}/subgraphs/{subgraphId}/properties`        | Returns authoritative `PropertyDto[]`.                                       |
| Container    | Fetch properties        | `GET /projects/{projectId}/containers/{containerId}/properties`        | Returns `PropertyDto[]`.                                                     |
| Container    | Patch ID                | `PATCH /projects/{projectId}/containers/{containerId}`                 | Updates graph-data field.                                                    |
| Container    | Patch properties        | `PATCH /projects/{projectId}/containers/{containerId}/properties`      | Returns authoritative `PropertyDto[]`.                                       |
| Module       | Patch graph-data fields | `PATCH /projects/{projectId}/spf-modules/{moduleId}`                   | Alias, container assignment, and dynamic port counts.                        |
| Module       | Fetch properties        | `GET /projects/{projectId}/spf-modules/{moduleId}/properties`          | Used for heap refresh after container cascade.                               |
| Module       | Patch properties        | `PATCH /projects/{projectId}/spf-modules/{moduleId}/properties`        | Used when module heap schema properties are editable in a container context. |
| Subsystem    | Patch name              | `PATCH /projects/{projectId}/subsystems/{subsystemId}`                 | Updates graph-data field.                                                    |
| Control Link | Fetch properties        | `GET /projects/{projectId}/control-links/{controlLinkId}/properties`   | Returns or adapts to schema properties for intents and heap.                 |
| Control Link | Patch properties        | `PATCH /projects/{projectId}/control-links/{controlLinkId}/properties` | Returns authoritative properties.                                            |

Concrete request DTO names belong in the API client files. The panel cards
should call entity-level functions and never construct raw `httpClient` calls.

---

## 9. State and Lifecycle

Each card hook owns:

- fetched `PropertyDto[]`
- adapted `TreeViewData`
- loading state
- card-level load error
- per-save failure state when the API client does not return a tree update

The tab store owns only:

- selected node descriptors
- selected edge descriptors
- graph data
- `isEditing`
- `isPropertiesPanelOpen`

When selection changes, cards unmount naturally. Any shared cache keyed by
entity ID must evict entries whose descriptor `systemId` is no longer selected.
In-flight GET or PATCH responses are ignored if their entity `systemId` is no
longer selected when the response resolves.

The visualizer must notify `onSelectionChange` for user-driven selection changes
and for internal selection clears caused by level changes or proxy-count changes.
This keeps sibling panels synchronized with the visualizer's internal ReactFlow
selection state.

---

## 10. Error Handling

| Scenario                      | Handling                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Property GET fails            | The affected card shows an inline load error and retry action.                                                       |
| Schema PATCH fails            | The affected Generic Tree View remains on the last known good committed state and the card surfaces an inline error. |
| Graph-data PATCH fails        | The static field reverts to its last known good value and shows an inline error.                                     |
| Scenario ID PATCH succeeds    | Re-fetch subgraph properties and replace the tree with the backend result.                                           |
| Container Heap PATCH succeeds | Refresh module heap properties for affected modules.                                                                 |
| Entity deleted during fetch   | Ignore the response and clear cached data for that entity.                                                           |
| Missing VDL discriminator     | Render an inline card error rather than inferring standard/MDF behavior.                                             |

---

## 11. Testing Strategy

Unit tests:

- `propertyDtosToTreeViewData` maps IDs, names, system IDs, elements, source,
  hidden state, and read-only state correctly.
- Card hooks fetch properties on entity ID change and ignore stale responses.
- Subgraph Scenario ID save triggers a full property re-fetch.
- Container Heap save triggers affected module property refresh.
- Module dynamic port editability is derived from `port.isStatic`.
- Virtual link row models expose source/destination or peer navigation IDs and
  real-link delete IDs.

Component tests:

- `PropertiesPanel` renders empty state, fixed group order, and in-group
  selection order from `SelectedNodeRef[]` and `SelectedEdgeRef[]`.
- Static cards respect `isEditing`.
- ID fields remain copyable when read-only.
- API-backed cards render `GenericTreeView` with `hideToolbar`,
  `defaultPolicyFilter={['BASIC', 'ADVANCED']}`, and correct `readOnly`.
- Standard VDL rows render source navigate, destination navigate, and delete.
- MDF VDL rows do not render navigate or delete actions.
- Backend-discriminated subsystem proxy data links render the direct Data Link
  card and are excluded from the Virtual Data Link group.
- Backend-discriminated subsystem proxy control links render the direct Control
  Link card and are excluded from the Virtual Control Link group.
- Virtual Control Link rows render Peer1 and Peer2 navigate actions.

Integration tests:

- Graph-designer adapter passes selected descriptors, graph data, and
  virtual-link arrays into the panel.
- Visualizer emits empty selected descriptor arrays when it clears selection
  because the level or visible proxy count changed.
- Schema edit auto-commit calls the correct entity API and reconciles returned
  tree data.

---

## 12. Implementation Notes

- Keep graph-designer adapter write callbacks store-only. Static field cards
  perform the entity PATCH and call those callbacks only after success.
- Replace direct `PropertyDto[]` rendering in API-backed cards with
  `SchemaPropertiesTree`.
- Split `onDeleteLink` into virtual-link-specific row delete callbacks.
- Correct group order so Control Links render before Virtual Data Links.
- Use visualizer selection descriptors for grouping. Do not parse rendered
  ReactFlow IDs such as `subgraph-1` or `container-5:1` in `PropertiesPanel`.
- Populate `meta.systemId` for every graph-designer node and edge so
  `SelectionChangePayload` carries both rendered IDs and graph-data IDs.
- Build Virtual Data Link card data only from frontend-created virtual data
  links; keep backend-discriminated subsystem proxy data links in direct Data
  Link card resolution.
- Keep backend-discriminated subsystem proxy control links in direct Control
  Link card resolution; do not treat them as Virtual Control Link rows.
- Add a dedicated `virtual-control-link-properties-card.tsx`; do not route
  virtual control links through the direct Control Link card.
- Keep the Properties View free of host-store imports.

---

## 13. Open Questions

None.
