# Properties View: Requirements

---

## 1. Context

### 1.1 Problem statement

The Properties View is a reusable panel for inspecting and editing properties
of entities selected in the Use Case Visualizer. Users should be able to select
one or more graph nodes or edges and immediately see the relevant metadata
without leaving the canvas workflow.

The panel must support read-write graph-designer usage and stay reusable
across host tabs by receiving all selection, edit-mode, graph data, and
callbacks through props.

### 1.2 What this builds on

- Use Case Visualizer selection state for selected node and edge IDs.
- Local graph data for static entity metadata and frontend-created virtual
  links.
- Backend properties endpoints for entity types with schema-driven properties.
- The existing Generic Tree View implementation for rendering schema property
  trees.
- Host-tab edit mode, panel visibility, navigation, and deletion state.
- Existing QUI React controls and application HTTP/auth infrastructure.

### 1.3 Scope decisions

- The panel is a widget-level component and does not import host-tab stores.
- The host tab owns the edit toggle; the panel receives `isEditing` as a prop.
- API-fetched property values are widget-local state, not persisted in the tab
  store.
- Subgraph and container property PATCH endpoints are defined by the backend
  team and are in scope.
- Container Type options come from the container properties GET payload.
- Schema-property payloads shall be rendered through the existing Generic Tree
  View rather than through a Properties View-specific display-type mapper.
- Virtual Data Links are frontend-created entities. Their standard/MDF variant
  discriminator is frontend-only and is set at VDL creation time.
- Backend-discriminated subsystem proxy data and control links are not virtual
  links for Properties View purposes. They shall be treated as standard Data
  Link and Control Link entities, respectively, and shall show the same
  properties as those standard link types.
- There is no maximum number of selected entities enforced by the Properties
  View.

---

## 2. Definitions

| Term                            | Definition                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Properties View                 | The side-panel widget that renders property cards for selected graph entities.                                                                         |
| Host tab                        | A tab that mounts the Properties View, such as graph designer.                                                                                         |
| Graph-data field                | A property whose value is stored in local graph data and affects canvas rendering, such as subgraph name or module alias.                              |
| Schema property                 | A backend-defined property returned as part of a self-describing `PropertyDto[]` payload and rendered through Generic Tree View.                       |
| Static entity property          | A property derived from local graph data without a properties endpoint fetch.                                                                          |
| Virtual Data Link               | A frontend-created virtual data link entity.                                                                                                           |
| Standard VDL                    | A Virtual Data Link variant that renders data link rows with navigate and delete actions.                                                              |
| MDF VDL                         | A Virtual Data Link variant that renders read-only data link rows plus a modules list.                                                                 |
| Subsystem proxy data link       | A backend-discriminated proxy data link for links that cross a subsystem boundary. It is treated as a standard Data Link by the Properties View.       |
| Subsystem proxy control link    | A backend-discriminated proxy control link for links that cross a subsystem boundary. It is treated as a standard Control Link by the Properties View. |
| Frontend-only VDL discriminator | The standard/MDF variant field set by the UI when a Virtual Data Link is created. It is not supplied by the backend DTO.                               |

---

## 3. Entity Property Inventory

The panel shall display the following properties for each supported entity.
Schema-property rows are rendered from backend property payloads through
Generic Tree View, so the backend controls the complete field set for those
rows.

### 3.1 Subgraph

| Property                          | Display behavior                                                                                                                                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                              | Editable graph-data field.                                                                                                                                                                                                                         |
| Subgraph ID                       | Read-only, copyable ID field.                                                                                                                                                                                                                      |
| Backend-defined schema properties | Editable through Generic Tree View unless the property is hidden or read-only. Includes fields such as Performance Mode, SG Direction, Scenario ID, SGProp, Clock Scale Factor, Bus Bandwidth Scale Factor, and VSID when returned by the backend. |

### 3.2 Container

| Property                          | Display behavior                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Container ID                      | Editable container identifier field.                                                                                                                                                                                                                                                 |
| Container Type                    | Editable single-selection combobox. Valid options come from the container properties payload.                                                                                                                                                                                        |
| Backend-defined schema properties | Editable through Generic Tree View unless the property is hidden or read-only. Includes fields such as Graph Position, Stack Size, Proc Domain, Container Heap, per-module heap list, Parent Container ID, Peer Container Heap, and data-driven groups when returned by the backend. |

### 3.3 Module

| Property           | Display behavior                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Alias              | Editable graph-data field.                                                                         |
| Module ID          | Read-only, copyable ID field.                                                                      |
| Instance ID        | Read-only, copyable ID field.                                                                      |
| Container ID       | Editable graph-data field.                                                                         |
| Max Input Ports    | Editable graph-data field only when the module supports dynamic input ports; otherwise read-only.  |
| Max Output Ports   | Editable graph-data field only when the module supports dynamic output ports; otherwise read-only. |
| Max Control Ports  | Editable graph-data field.                                                                         |
| Input Ports table  | Read-only local graph-data table.                                                                  |
| Output Ports table | Read-only local graph-data table.                                                                  |

### 3.4 Subsystem

| Property     | Display behavior              |
| ------------ | ----------------------------- |
| Name         | Editable graph-data field.    |
| Subsystem ID | Read-only, copyable ID field. |

### 3.5 Data Link

| Property                   | Display behavior                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Source Component Info      | Read-only local graph-data field showing source component name and instance ID.      |
| Source Port ID             | Read-only local graph-data field.                                                    |
| Destination Component Info | Read-only local graph-data field showing destination component name and instance ID. |
| Destination Port ID        | Read-only local graph-data field.                                                    |

Subsystem proxy data links shall use this same property inventory.

### 3.6 Control Link

| Property             | Display behavior                                                                       |
| -------------------- | -------------------------------------------------------------------------------------- |
| Peer1 Component Info | Read-only local graph-data field.                                                      |
| Peer1 Port ID        | Read-only local graph-data field.                                                      |
| Peer2 Component Info | Read-only local graph-data field.                                                      |
| Peer2 Port ID        | Read-only local graph-data field.                                                      |
| Intents table        | Editable schema-property content when returned by the control-link properties payload. |
| Heap Property        | Editable schema-property content when returned by the control-link properties payload. |

Subsystem proxy control links shall use this same property inventory.

### 3.7 Standard Virtual Data Link

| Property                | Display behavior                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Data Links list         | Rows showing source module, source ID/port, destination module, and destination ID/port. |
| Navigate to Source      | Row action that requests canvas focus for the source node.                               |
| Navigate to Destination | Row action that requests canvas focus for the destination node.                          |
| Delete                  | Row action that requests deletion of the related real data link.                         |

### 3.8 MDF Virtual Data Link

| Property        | Display behavior                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Data Links list | Read-only rows showing source module, source ID/port, destination module, and destination ID/port. |
| Modules list    | Read-only rows showing module name, processing domain, and module ID.                              |

### 3.9 Virtual Control Link

| Property                       | Display behavior                                                      |
| ------------------------------ | --------------------------------------------------------------------- |
| Real Control Links list        | Scrollable list of contained real control links.                      |
| Peer1 and Peer2 Component Info | Read-only fields per contained real control link.                     |
| Navigate to Peer1              | Row action that requests canvas focus for the Peer1 node.             |
| Navigate to Peer2              | Row action that requests canvas focus for the Peer2 node.             |
| Intents table                  | Row content showing intents for the contained real control link.      |
| Heap ID                        | Row content showing the heap ID for the contained real control link.  |
| Delete                         | Row action that requests deletion of the contained real control link. |

---

## 4. Functional Requirements

### 4.1 Panel Composition and Selection

#### FR-PV-01: Empty selection state

When no graph entity is selected, the panel shall render an empty state telling
the user to select a node or edge to view its properties.

#### FR-PV-02: Single-entity display

When exactly one supported entity is selected, the panel shall render one
property card for that entity with an entity header and property rows.

#### FR-PV-03: Multi-entity display

When multiple supported entities are selected, the panel shall render property
cards for all selected entities grouped by entity type.

#### FR-PV-04: Multi-selection group behavior

Multi-selection groups shall be collapsible, shall show the entity type and
count, and shall render in this fixed order: Subgraphs, Containers, Modules,
Subsystems, Data Links, Control Links, Virtual Data Links, Virtual Control
Links.

#### FR-PV-05: Card order within groups

Cards within each multi-selection group shall render in the order reported by
the host-provided `selectedNodeIds` and `selectedEdgeIds` arrays.

#### FR-PV-06: Unbounded selection rendering

The panel shall not impose a maximum selected-entity count, warning threshold,
or render cap. Large selections shall remain representable through collapsible
groups and cards.

### 4.2 Entity Coverage

#### FR-PV-07: Subgraph properties

For a selected subgraph, the panel shall show and edit the subgraph name from
local graph data, show a copyable read-only subgraph ID, and show and edit all
backend-defined schema properties from the subgraph properties endpoint.

#### FR-PV-08: Container properties

For a selected container, the panel shall show and edit the container ID,
container type, and all backend-defined schema properties from the container
properties endpoint.

#### FR-PV-09: Container Type options

The Container Type control shall source its valid options from the container
properties GET payload rather than a hard-coded frontend enum.

#### FR-PV-10: Single Container Type

Each container shall have exactly one selected Container Type. The panel shall
render Container Type as a single-selection combobox.

#### FR-PV-11: Module properties

For a selected module, the panel shall show and edit module alias, container
assignment, and dynamic port counts; show non-dynamic port counts as read-only;
show copyable read-only Module ID and Instance ID; and show module port tables
from local graph data.

#### FR-PV-12: Subsystem properties

For a selected subsystem, the panel shall show and edit the subsystem name and
shall show a copyable read-only subsystem ID.

#### FR-PV-13: Data link properties

For a selected data link, including a subsystem proxy data link, the panel
shall show source component, destination component, and port information as
read-only static data from local graph data.

#### FR-PV-14: Control link properties

For a selected control link, including a subsystem proxy control link, the
panel shall show read-only peer component and port information from local graph
data, shall show and edit backend-defined intents and heap properties.

#### FR-PV-15: Standard VDL properties

For a selected standard Virtual Data Link, the panel shall render the
underlying data link rows with navigate and delete actions.

#### FR-PV-16: MDF VDL properties

For a selected MDF Virtual Data Link, the panel shall render read-only data
link rows and a modules list.

#### FR-PV-16A: Subsystem proxy link handling

When the graph designer selection includes a backend-discriminated subsystem
proxy data link, the panel shall route it to the standard Data Link card and
show the properties defined by FR-PV-13. The panel shall not route it to the
Virtual Data Link card or apply standard/MDF VDL behavior to it.

When the graph designer selection includes a backend-discriminated subsystem
proxy control link, the panel shall route it to the standard Control Link card
and show the properties defined by FR-PV-14. The panel shall not route it to
the Virtual Control Link card or apply Virtual Control Link behavior to it.

#### FR-PV-17: Virtual Control Link properties

For a selected Virtual Control Link, the panel shall render a scrollable list
of real control links. Each row shall show peer component information, intents,
heap ID, and a delete action.

#### FR-PV-18: Virtual Control Link delete scope

The panel shall not expose a single delete action for the Virtual Control Link
wrapper. Deletion from the Virtual Control Link card shall apply only to
individual contained real control links.

#### FR-PV-19: VDL variant source

The panel shall determine standard vs MDF Virtual Data Link behavior from the
frontend-only discriminator set when the UI creates the Virtual Data Link. The
panel shall not require the backend DTO to provide this discriminator.

### 4.3 Editability and Field Rendering

#### FR-PV-20: Host-controlled edit mode

The panel shall receive edit mode from the host tab. When `isEditing` is false,
editable fields shall render read-only; when true, editable fields shall render
as interactive controls unless the field itself is read-only.

#### FR-PV-21: Copyable IDs

ID copy controls shall remain active even when the panel is read-only.

#### FR-PV-22: Generic Tree View schema rendering

For schema-property payloads, the panel shall render the backend-returned
property tree through the existing Generic Tree View. The properties GET
response shall be treated as the source of both field schema and current
values; no separate schema-definition endpoint shall be required.

#### FR-PV-23: Hidden policy

A schema property marked hidden shall not render in the Generic Tree View.

#### FR-PV-24: Read-only policy

A schema property marked read-only shall never be interactive in the Generic
Tree View, regardless of host edit mode.

#### FR-PV-25: Generic Tree View ownership

The Properties View shall not own per-`displayType` control mapping for schema
properties. Schema element rendering behavior shall be delegated to Generic
Tree View.

### 4.4 Save, Refresh, and Error Behavior

#### FR-PV-26: Auto-save

Editable field changes shall auto-save without a Save button. Text inputs shall
debounce for 300 ms before saving; non-text controls shall save immediately on
change.

#### FR-PV-27: Save feedback

While a field save is in flight, the affected field shall show a loading state.
Successful saves shall clear loading and errors without showing a success toast.

#### FR-PV-28: Field-level save errors

When a field save fails, the panel shall show an inline error next to the
affected field and shall not rely on a generic toast as the primary error
surface.

#### FR-PV-29: Failed save value handling

When a PATCH call fails, the edited field shall revert to its last known good
value.

#### FR-PV-30: Properties fetch errors

When fetching schema properties for an entity fails, the corresponding card
shall show an inline load error with a retry affordance.

#### FR-PV-31: Scenario ID refresh

After a successful subgraph Scenario ID update, the panel shall re-fetch the
subgraph properties and replace the cached property data with the authoritative
backend result.

#### FR-PV-32: Container Heap cascade refresh

After a successful Container Heap update, the panel shall refresh affected
module heap property data so displayed module values reflect the backend
cascade.

### 4.5 Actions and Host Integration

#### FR-PV-33: Navigate to node

Virtual Data Link and Virtual Control Link rows with navigate affordances shall
notify the host tab of the target node ID so the host can focus that node on
the canvas. Standard Virtual Data Link rows shall provide separate source and
destination navigation. Virtual Control Link rows shall provide separate Peer1
and Peer2 navigation.

#### FR-PV-34: Virtual link row delete actions

Standard Virtual Data Link row delete actions shall notify the host tab of the
real data link ID to delete. These deletes are required because the real data
links represented by a Virtual Data Link are not shown directly in the graph
designer.

Virtual Control Link row delete actions shall notify the host tab of the
contained real control link ID to delete. Direct Control Link cards shall not
define a standalone delete action.

#### FR-PV-35: Graph-data updates

Edits to graph-data fields shall update the host-owned graph data through host
callbacks after the Properties View card's backend PATCH succeeds, so the
canvas reflects the committed change.

Host callbacks for graph-data edits shall be store-update notifications only
and shall not issue their own duplicate entity PATCH calls.

#### FR-PV-36: Properties View visibility

Each host tab that supports the Properties View shall own panel visibility in
its tab state.

#### FR-PV-37: Host-tab portability

The Properties View shall be mountable in graph designer and future host tabs
without importing those host stores directly.

### 4.6 Lifecycle and Cleanup

#### FR-PV-38: Deselection cleanup

When an entity leaves the current selection, the panel shall evict cached
property data for that entity.

#### FR-PV-39: Deleted entity cleanup

When a selected or cached entity is deleted from graph data, the panel shall
discard stale cached data and ignore any in-flight fetch response for that
entity.

---

## 5. Invariants

**I1 - Props-only widget boundary:** The Properties View shall not import or
read host-tab stores directly. Host state enters through props and exits
through callbacks.

**I2 - Widget-local fetched state:** API-fetched property values, loading
state, and field errors shall remain widget-local and shall not be persisted in
tab stores.

**I3 - Host-owned graph data:** Graph-data field edits shall update the host
store only through host callbacks.

**I4 - Single PATCH owner:** Properties View cards shall own backend PATCH
calls for editable fields. Host graph-data callbacks shall update host state
only and shall not perform backend PATCH calls.

**I5 - Most restrictive edit policy wins:** A field is interactive only when
the host is in edit mode and the field itself is not read-only.

**I6 - No hidden-field leakage:** Hidden schema properties shall not render in
read-write mode or read-only mode.

**I7 - Virtual link variants are explicit:** Standard vs MDF Virtual Data Link
rendering shall be driven by the frontend-created VDL discriminator, not
inferred from derived properties such as module count. Backend-discriminated
subsystem proxy data and control links shall not be treated as virtual links.

---

## 6. Non-Functional Requirements

| ID        | Requirement                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| NFR-PV-01 | The panel shall fetch schema properties on demand only for selected entities.                                             |
| NFR-PV-02 | Text-input auto-save shall be debounced to avoid per-keystroke PATCH traffic.                                             |
| NFR-PV-03 | Host adapters shall use narrow store selectors so unrelated host-store updates do not force unnecessary panel re-renders. |
| NFR-PV-04 | Cached property data shall be evicted on deselection or deletion so long sessions do not retain unbounded stale state.    |
| NFR-PV-05 | The feature shall introduce no new open-source runtime libraries.                                                         |
| NFR-PV-06 | Clipboard operations shall copy entity IDs only and shall use browser clipboard APIs.                                     |

---

## 7. Out of Scope

- Undo/redo for property edits.
- Bulk editing across multiple selected entities.
- A property search or filter inside the panel.
- Client-side validation beyond displaying server-side validation errors.
- Backend implementation of properties endpoints.
- Persisting fetched property values outside the widget lifetime.
- Subsystem proxy-specific property cards beyond the standard Data Link and
  Control Link property behavior.

---

## 8. Open Questions

None.
