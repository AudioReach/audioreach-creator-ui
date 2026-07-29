# Usecase Designer — Edit Feature: Requirements

---

## 1. Context

### 1.1 Problem statement

Today, the Graph Designer canvas is read-only: a user can select use cases,
view the resulting module/subgraph/subsystem graph, and double-click a
module to open a cal/tag tuning tab — but cannot change the graph's
structure from the canvas itself. This feature adds a structural editing
mode to the same canvas: dragging modules/subgraphs from palettes onto the
canvas, drawing or deleting connections, resizing port counts, grouping
subgraphs into subsystems, and configuring calibration/tag keys and KV
selections — all via context menus, a properties panel, and a Key
Configurator panel. This turns the Graph Designer from a browsing tool into
the primary authoring surface for use-case graphs.

### 1.2 What this builds on

- The existing Graph Designer canvas (View mode), its `UsecaseVisualizer`
  producer/consumer callback boundary, properties panel widget, and Key
  Configurator panel.
- The existing FlexLayout tab-lifecycle model and `ConfigFileManager`/
  `useUserPreferences` preferences mechanism.
- Apply/Discard Changes, designed separately — see
  `../apply-discard-changes/design.md`.

### 1.3 Key decisions already made

- Every structural change is confirmed by the backend before the canvas
  reflects it — no optimistic UI. The user sees a loading state while a
  change is in flight and a toast if it fails.
- The subsystem-level/use-case-level display-mode toggle ("subsystem level"
  vs. "use case level", consumed by FR-PAL-01) is a pre-existing,
  cross-cutting concept built separately; this feature only consumes
  whatever it exposes once built elsewhere.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| Subgraph provenance | One of three states tracked per subgraph for the current edit session: **palette-placed** (placed via the subgraph palette, FR-SG-01), **pre-loaded** (part of the selected use case when Edit mode was entered), or **newly-created** (created this session, e.g. via drag-to-empty-space, FR-MOD-03). Provenance determines delete behavior (FR-SG-06/07/08). |
| Session-local | Tracked only in frontend state for the current edit session, not staged to or persisted by the backend until Apply Changes (or, for provenance/pair-link data, never sent to the backend at all). |
| MDF (Multi DSP Framework) | A use-case category spanning multiple DSPs, whose cross-DSP connections render via the Expanded/Virtual display modes (FR-MDF-02). |
| Subgraph proxy node | The collapsed on-canvas representation of a subgraph. Cannot be a connection endpoint (FR-PROXY-01); renaming it renames the underlying subgraph (FR-PROXY-02). |
| Excluded link | A pair-auto-rendered connection (FR-SG-02) the user has chosen to hide from routing via "Exclude Link" (FR-SG-03). It still exists in the backend; only its on-canvas rendering and routing-time use are affected. |

---

## 3. Functional Requirements

### 3.1 Canvas modes

**FR-MODE-01** The canvas operates in two modes: **View** and **Edit**. Edit mode
is entered via an **"Edit"** button. Edit mode is exited via
the **"Apply Changes"** button (commits staged edits) or the **"Discard"**
button (abandons the session).

**FR-MODE-02** In View mode, the canvas renders use cases from the last
selection.

**FR-MODE-03** In View mode, the canvas renders already-created use cases. The
module palette, subgraph palette, and Key Configurator panel remain visible
but are **read-only**. The only available interactive operation is
double-clicking a module, which opens a new tab for cal/tag data tuning.
No structural editing operations are available in View mode.

**FR-MODE-04** In View mode, clicking a module, subgraph, container, subsystem,
subgraph proxy node, or data/control link opens the properties panel for that
component in a read-only view. This is separate from the double-click
behavior in FR-MODE-03, which opens a dedicated cal/tag tuning tab — the two
interactions coexist.

**FR-MODE-05** In Edit mode, the module palette, subgraph palette, properties
panel, and Key Configurator panel — all present but read-only in View mode
per FR-MODE-03/FR-MODE-04 — become editable. The canvas additionally exposes
context menus, inline connection creation, the Apply Changes button, and the
Discard button, none of which are present in View mode.

---

### 3.2 Module operations

**FR-MOD-01** User can add a module instance by dragging from the module palette
onto any container. Multiple instances of the same module definition are
allowed within a container.

**FR-MOD-02** When a module is added to a container that belongs to an existing
subgraph, the backend is called immediately and the canvas is updated only
after the backend confirms the change. If the call fails, an error toast is
shown and no change is applied to the canvas. The change propagates to all
use cases that contain that subgraph only when Apply Changes is run.

**FR-MOD-03** User can add a module by dragging from the module palette onto
**empty canvas space**. This atomically auto-creates a new subgraph → new
container → module instance via a single backend call. The canvas is updated
only after the backend confirms. If the call fails, an error toast is shown
and no change is applied to the canvas.

**FR-MOD-04** User can add a module by dragging it inside a subgraph but
**outside any existing container**. The tool auto-creates a new container
within that subgraph and places the module inside it. The canvas is updated
only after the backend confirms. If the call fails, an error toast is shown
and no change is applied to the canvas.

**FR-MOD-05** User can select and delete a module instance via the context
menu or the **Delete key**. The canvas is updated only after the backend
confirms the deletion. On failure, an error toast is shown.

**FR-MOD-06** When a module deletion is confirmed by the backend, the backend
also deletes all links connected to that module. The UI must remove those links
from the canvas in the same response cycle to stay in sync.

**FR-MOD-07** User can rename a module instance via the properties panel. The
rename is confirmed by the backend before the canvas reflects the change.

**FR-MOD-08** Dropping a module onto another module resolves to the same
placement as dropping onto that module's own container (FR-MOD-01) — the drop
is not rejected; the module is added to the container underneath and
rendered at the drop coordinates (FR-POS-01), and the user may reposition it
afterward if the overlap is undesirable. This mirrors how dragging an
already-placed module to reposition it already allows dropping onto another
module. Dropping a module onto a **subgraph proxy node** or onto a
**subsystem node** is still not permitted — unlike a module-on-module drop,
neither has a container to resolve to (a proxy node represents a collapsed
subgraph with no visible container; a subsystem contains subgraphs, not
modules directly). The tool must reject such a drop at the drag-and-drop
level and provide a visual indicator that the target is invalid. (Use case
level never renders subsystem nodes on canvas at all — see FR-PAL-01's
dependency note — so this rejection is only reachable in subsystem level: a
module dropped on a subsystem node while the canvas is in subsystem level is
rejected regardless of FR-PAL-01's separate palette-disable, since that
disable only applies to the subgraph palette, not the module palette.)

---

### 3.3 Subgraph operations

**FR-SG-01** User can place an existing subgraph onto the canvas by dragging
from the subgraph palette. On drop, the full subgraph contents (all containers,
modules, and internal links) are fetched from the backend and rendered on
canvas. This placement is **session-local** — it is not staged to the backend.

**FR-SG-02** When a subgraph is dropped onto the canvas, the tool calls the
backend subgraph-pairs API to retrieve all known linked subgraph pairs. For
each returned pair where one subgraph is the newly dropped one and the other is
already on the canvas, the tool renders the corresponding connection on canvas
from the API response — these connections already exist in the backend and
require no staging. They are kept in UI cache only. The user does not need to
draw these connections manually.

**FR-SG-03** After a subgraph is placed and its pair connections are rendered per
FR-SG-02, the user may choose to exclude one or more of those connections from
use-case generation. The tool provides an **"Exclude Link"** action on each
auto-rendered connection. Excluding a connection does not delete it from the
backend — the connection remains in the graph. Excluded links are tracked per
session and passed to the backend on Apply Changes so they are not used when
generating use cases.

**FR-SG-04** Once a connection is excluded per FR-SG-03, it is removed from the
visual canvas. It remains tracked in session state (per FR-SG-03) and is
included in the Apply Changes payload — only its on-canvas rendering is
affected.

**FR-SG-04a** If the user redraws the exact same connection (same source port,
same target port, same direction) as a currently excluded link, the tool treats
this as re-inclusion, not creation: the link is removed from the excluded-links
list and reappears on canvas, and **no backend API call is made** — the
connection already exists in the backend, so there is nothing to (re-)create.

**FR-SG-05** A subgraph already on the canvas is shown as **disabled** in the
subgraph palette with a tooltip "Already present on the canvas". Duplicate placement
is blocked. Palette ordering is unaffected — disabled entries are shown
greyed-out in their existing list position rather than sorted to the bottom.

**FR-SG-06** Removing a **palette-placed** subgraph (one placed in the current
session via the subgraph palette) from the canvas is a UI cache delete only —
no backend call is made — **provided no module or link inside it has already
been staged to the backend this session** (e.g. a module added into it after
placement, per FR-MOD-01/03/04). If any child has been staged, the subgraph
delete falls back to the same backend cascade as FR-SG-07/FR-SG-08: the
already-committed module/link content is not just a UI concern anymore and
must be removed server-side too, not silently orphaned. The subgraph's own
placement (the part that really was never staged) contributes nothing to that
cascade — it is the *children's* staged state alone that decides which path
this delete takes.

**FR-SG-07** Removing a **pre-loaded** subgraph (one that was part of the
selected use case when edit mode was entered) from the canvas stages a delete
to the backend immediately, via the same delete call used for FR-SG-08. The
backend cascades the deletion to all of the subgraph's containers, modules,
and links atomically. The canvas is updated only after the backend
confirms. On Apply Changes, use-case generation accounts for this deletion
and impacts all use cases that contained this subgraph.

**FR-SG-08** Deleting a **newly created subgraph** (created in this session,
e.g., via drag-to-empty-space) stages the same delete call as FR-SG-07. The
backend cascades the deletion to all of the subgraph's containers, modules,
and links atomically — there is no separate cascade-specific endpoint; both
provenances delete identically from the frontend's perspective. This can be
triggered via context menu or the **Delete key**. The canvas is updated only
after the backend confirms the entire deletion. On failure, an error toast is
shown and no change is applied.

**FR-SG-09** User can rename a subgraph via the properties panel. The rename is
confirmed by the backend before the canvas reflects the change.

**FR-SG-10** Subgraphs are created implicitly — via FR-MOD-03 (dragging a
module onto empty canvas space, which auto-creates a new subgraph, container,
and module instance). There is no explicit standalone "add subgraph" action.

**FR-SG-11** Dropping a subgraph onto an existing subgraph, or onto any of
that subgraph's contents (containers or modules), is not rejected —
the placement (FR-SG-01's full fetch-and-render) proceeds at the drop
coordinates regardless of visual overlap with what's underneath, the same
treatment FR-MOD-08 gives module-on-module drops; the user repositions
afterward if the overlap is undesirable. Dropping a subgraph onto a
**subgraph proxy node** is also allowed: the placed subgraph's contents
render overlapping the proxy node at the drop coordinates — the proxy node
is not expanded or otherwise affected by the drop; it is simply a node the
new subgraph's contents happen to render on top of, same as any other
overlap. (Dropping a subgraph onto a subsystem is separately prevented by
FR-PAL-01, since the subgraph palette is disabled entirely while the canvas is
in subsystem level.)

---

### 3.4 Container operations

**FR-CONT-01** User can delete a container via context menu or the **Delete key**.
Deleting a container cascades to delete all module instances within it and all
links connected to those modules. The canvas is updated only after the backend
confirms the entire deletion. On failure, an error toast is shown.

**FR-CONT-02** Containers do not have names. No rename operation is available for
containers.

**FR-CONT-03** Containers are created implicitly — either via FR-MOD-04 (dragging a
module inside a subgraph outside any existing container) or via FR-MOD-03
(dragging a module to empty canvas space). There is no explicit standalone
"add container" action.

**FR-CONT-04** User can edit the container ID from the properties panel. The
change is confirmed by the backend before the canvas reflects the update. On
failure, an error toast is shown.

---

### 3.5 Link operations (data and control links)

**FR-LINK-01** User can create a data or control link by **either** of two
methods, both funneling into the same validation and backend call:

- **Drag-connect**: dragging directly from a source port handle to a target
  port handle (the canvas's existing native connection gesture). Suited to
  connecting two ports both visible in the current view.
- **Two-click**: right-clicking a source port to start a connection, then
  right-clicking a destination port to complete it (see FR-PORT-06 for the port
  context menu interface). Required when the target port is not yet
  rendered in the current view — e.g. connecting a module outside a
  subsystem to a module inside a currently-collapsed subsystem — since a
  single drag gesture cannot span a navigation/expand action in between.

The link is rendered on canvas only after the backend confirms, regardless of
which method initiated it.

**FR-LINK-02** While a two-click connection is in progress (after right-clicking
a source port), pressing **Escape** cancels the operation and clears the
in-progress visual indicator. No API call is made. This applies only to the
two-click method — drag-connect has its own existing cancel behavior
(releasing the drag off any valid target).

**FR-LINK-03** Links can connect modules across any two subgraphs, and from module
ports to subsystem ports.

**FR-LINK-04** When a user connects a module inside **Subsystem A** to a module
inside **Subsystem B**, the backend automatically creates the full set of
intermediate connections: module→Subsystem A, Subsystem A→Subsystem B, and
Subsystem B→module. The UI must render all connections returned in the backend
response after the operation completes.

**FR-LINK-05** Client-side port validation runs before the API call: port type
compatibility (data-to-data, control-to-control) is enforced eagerly for all
ports. No client-side `maxConnections` check gates the API call for either
port type — the backend is the sole arbiter of whether a connection is
created (FR-LINK-06). **For control ports only**, once the backend confirms the
connection was created, the tool checks whether the port's connection count
now exceeds its `maxConnections` limit and, if so, shows a non-blocking
warning ("This connection exceeds the port's supported connection limit;
concurrent connections beyond this limit may not behave as expected") — the
connection is not undone or blocked; this is purely informational. Data
ports are never subject to this check.

**FR-LINK-06** Server-side validation is the final arbiter. If the server rejects
a link, no change is applied to the canvas and an error toast is shown.

**FR-LINK-07** User can delete a link via context menu or the **Delete key**. The
link is removed from the canvas only after the backend confirms the deletion.

---

### 3.6 Subsystem operations

**FR-SUBSYS-01** User can create a new subsystem or move a subgraph or subsystem
into an existing subsystem by right-clicking a subgraph or subsystem and
selecting **"Move to Subsystem"**. The user is then prompted to select an
existing subsystem or create a new one. When the right-clicked node is
itself a subsystem, that subsystem is excluded from the list of existing
subsystems offered as a destination — a subsystem cannot be moved into
itself. The canvas is updated only after the backend confirms. On failure,
an error toast is shown.

**FR-SUBSYS-02** User can delete a subsystem via context menu or the **Delete key**.
**Confirmed with the backend team: subsystem delete only removes an empty
subsystem — it does not cascade.** The context-menu Delete item is disabled
when the subsystem still has contents (subgraphs, modules, containers, or
links); the user must first remove/move out its contents (FR-SUBSYS-05) or use
**Expand** (FR-SUBSYS-06) to promote its contents before Delete becomes available.
If Delete is invoked on a non-empty subsystem via the Delete key (no
menu-level gate on that path), the backend rejects the call and it is
handled like any other failed mutation — error toast, no change to the
canvas. The canvas is updated only after the backend confirms the deletion.

**FR-SUBSYS-03** User can rename a subsystem via the properties panel. The rename
is confirmed by the backend before the canvas reflects the change.

**FR-SUBSYS-04** User can update a subsystem by adding subgraphs or subsystems into
it (FR-SUBSYS-01), or removing subgraphs or subsystems from it (FR-SUBSYS-05). Removing
a subgraph or subsystem re-parents it one level up; the subsystem itself is
**not** deleted, even if this empties it of all contents — confirmed with the
backend team. Each change is confirmed by the backend before the canvas
reflects the update.

**FR-SUBSYS-05** User can remove a subgraph or subsystem from its parent subsystem
via a **"Remove from Subsystem"** context-menu action — the symmetric
counterpart to FR-SUBSYS-01's "Move to Subsystem." The backend re-parents the
moved node one level up. The now-possibly-empty subsystem is **not** deleted
by this action. The canvas is updated only after the backend confirms. On
failure, an error toast is shown.

**FR-SUBSYS-06** User can **expand** a subsystem. Expanding a subsystem deletes the
subsystem container and moves all its components (subgraphs, modules,
containers, and internal links) one hierarchy level up. The backend deletes all
connections to the subsystem's external ports and returns the list of deleted
connections in the API response. The UI must remove those connections from the
canvas in the same response cycle. The canvas is updated only after the backend
confirms the entire expand operation. On failure, an error toast is shown and
no change is applied.

---

### 3.7 Port operations

**FR-PORT-01** User can increase or decrease the **data port count** on a module
instance from the properties panel. The canvas is updated only after the
backend confirms. Newly added ports become available for connection.

**FR-PORT-02** User can increase or decrease the **control port count** on a
module instance from the properties panel. The canvas is updated only after the
backend confirms. Newly added ports become available for connection.

**FR-PORT-03** When a port count is decreased, the backend determines whether the
decrease is allowed. If rejected, an error toast is shown and no change is
applied.

**FR-PORT-04** User can increase or decrease the **data port count** on a
subsystem from the properties panel. The canvas is updated only after the
backend confirms. Newly added ports become available for connection.

**FR-PORT-05** User can increase or decrease the **control port count** on a
subsystem from the properties panel. The canvas is updated only after the
backend confirms. Newly added ports become available for connection.

**FR-PORT-06** In Edit mode, right-clicking a port shows a context menu with two
options:
- **Start connection**: begins a connection operation from this port.
- **End connection**: completes an in-progress connection at this port. This
  option is shown only when a connection is already in progress.

---

### 3.8 Apply Changes

**FR-APPLY-01** An "Apply Changes" button is visible in edit mode and disabled
while an Apply is in-flight, or while any other staged operation
(module/subgraph/link/etc. add, delete, rename, port-count change) is still
awaiting backend confirmation — see [design.md §6.1](design.md#61-front-end-store-composition)'s
`isMutating` lock.

**FR-APPLY-02** Apply sends the following to the backend routing endpoint: the
selected use cases, any excluded data/control links from the current session
(FR-SG-03), and the selected KV assignments for all subgraphs on canvas.
Subsystem Keys assignment (FR-KEYCFG-03) is staged immediately at assignment time,
not carried in the Apply payload — see FR-KEYCFG-03.

**FR-APPLY-03** On Apply success, the backend returns a **modification summary**.
The UI displays this summary to the user. On failure, the failure details are
shown within the summary view rather than as a toast notification. This
applies when the backend responds at all — `issues` entries with
`severity: 'FATAL'/'ERROR'` in a completed `200` response. If the request
itself never completes (network error, timeout, thrown exception), there is
no response body to summarize, so this case falls back to the tool's
standard error-toast pattern instead of opening the summary view; the
session remains in Edit mode with staged changes intact, same as any other
failed backend call in this tool.

---

### 3.9 Palettes

**FR-PAL-01** Dragging and dropping subgraphs from the subgraph palette is
**not permitted when the canvas is in subsystem level**. Palette items are shown
as disabled in subsystem level with a tooltip explaining the restriction.

> **Dependency note:** "Subsystem level" vs. "use case level" is a pre-existing
> display toggle (subsystem level shows subsystems for the selected use
> cases; use case level hides all subsystems even if present) that applies to both
> View and Edit mode — it is not introduced by this feature. As of this
> writing, the toggle is not yet implemented in code (no consuming
> state/UI/canvas-filtering logic exists; the closest analogs are two
> unwired preference fields, `visualization.simplifySubsystems` and
> `usecases.mode`). Building that toggle is **out of scope** for Usecase
> Designer Edit — this feature only consumes whatever state it exposes once
> built elsewhere.

---

### 3.10 Context menus

**FR-CTXMENU-01** In Edit mode, right-clicking a node shows a context menu with a
**Delete** option. Selecting it dispatches to the per-node-type delete
behavior below. Ownership split: which backend call (if any) each node type
triggers, and the provenance-based branching for subgraphs, is Node
Operations' concern (see
[node-operations-design.md §4.5](node-operations-design.md#45-delete-req-016a-req-016b-req-016c-req-048));
the context menu itself — its presence, the Delete menu item, and wiring the
click to the dispatch call below — is Canvas UI Mechanics' concern:
- **Palette-placed subgraph**: removes from the UI cache only, no backend
  call — unless it has staged child edits, in which case it falls back to
  the same backend cascade as a pre-loaded/newly-created subgraph (see
  FR-SG-06).
- **Pre-loaded subgraph**: stages a delete to the backend.
- **Newly created subgraph**: stages a delete and cascades to remove all
  containers, modules, and links.
- **Module or container**: stages a delete to the backend.

**FR-CTXMENU-02** In Edit mode, right-clicking an edge shows a context menu with a
**Delete** option.

**FR-CTXMENU-03** The **Delete key** triggers the same delete action as the context
menu Delete option for any currently selected node or edge.

---

### 3.11 Properties panel

**FR-PROP-01** Selecting a node opens a properties panel showing editable fields
for that node type. For modules and subsystems, the panel includes port count
controls (data and control, increase/decrease) per FR-PORT-01 to FR-PORT-05. Name
fields are shown where renaming is supported.

---

### 3.12 MDF (Multi DSP Framework) use cases

**FR-MDF-02** When a user adds a connection between modules running on two
different DSPs, the backend inserts additional bridge modules and connections to
represent the cross-DSP path. The UI must support two display modes for this,
controlled by user preference:
- **Expanded view**: shows the backend-generated bridge modules and connections
  explicitly on the canvas.
- **Virtual connection view**: shows a single logical connection line hiding
  the intermediate complexity.

**FR-MDF-03** *(Deferred to a future enhancement, same treatment as
FR-ENH-02/FR-ENH-03/FR-ENH-04/FR-ENH-05. No backend endpoint for this exists
today and none is currently planned — see
[design.md §16](design.md#16-not-doing).)*
User can right-click any module and select **"Offload to other
DSP"** from the context menu, then choose the target DSP from a list of
available DSPs. The tool calls a new backend API for this operation:
- **First offload of this module**: the backend inserts a new IPC TX module
  (before the offloaded module, on its original DSP) and a new IPC RX module
  (after it, on the target DSP), reassigns the offloaded module's container
  to one associated with the target DSP, and reroutes any existing links
  connected to the module through the new IPC TX/RX pair.
- **Re-offloading a module that already has an IPC TX/RX pair from a prior
  offload** (including offloading it back to its original DSP): the backend
  updates the existing IPC TX/RX pair in place to reflect the new target
  DSP, rather than inserting an additional pair or deleting and recreating
  one. There is no dedicated "un-offload" action — offloading back to the
  original DSP is the same action, targeting that DSP.
- In both cases, the backend returns three component collections — added,
  updated, and deleted — in one response, describing everything
  added/changed (new or updated IPC modules, new/rerouted links, new
  container assignment), and the UI reconciles all three in the same
  response cycle.
- This follows the same backend-driven intermediate-insertion pattern as
  FR-LINK-04/FR-MDF-02. The IPC TX/RX modules are subject to FR-MDF-02's
  Expanded/Virtual display-mode preference, the same as other cross-DSP
  bridge modules.
- The canvas is updated only after the backend confirms. On failure, an
  error toast is shown and no change is applied.

---

### 3.13 Subgraph proxy node operations

**FR-PROXY-01** Connections cannot be created to or from a subgraph proxy node.
During a connection operation, proxy node ports must be shown as invalid drop
targets. This restriction exists because the proxy node represents a collapsed
subgraph and the target module within it is ambiguous until expanded.

**FR-PROXY-02** User can rename a subgraph proxy node via the properties panel.
The rename is confirmed by the backend before the canvas reflects the change.

---

### 3.14 Positioning

**FR-POS-01** When a user drags and drops any component (module, subgraph) onto
the canvas, it must be rendered at the exact drop coordinates (x, y).
Auto-layout must not reposition a newly placed component away from the drop
point.

**FR-POS-02** Users can drag any node (module, container, subgraph) to reposition
it on the canvas. This is available in **both View and Edit modes**. Position
changes are applied to the canvas immediately but are **not staged to the
backend as part of the edit workflow** — they are persisted separately as
layout overrides (persistence mechanism TBD with backend team).

---

### 3.15 Edit mode lifecycle

**FR-LIFECYCLE-01** While in edit mode, the tool must block the user from opening the
**Discovery Wizard** or the **Diff/Merge** view. Both can modify the graph
structure independently of the edit session, and the conflict resolution between
them and staged edits is undefined. A tooltip or modal should explain why they
are unavailable.

**FR-LIFECYCLE-02** The user can click the **Discard** button at any time during the
edit session. Changes made during the session are staged to the backend but not
yet committed. A confirmation prompt is shown before discarding. On
confirmation, a discard request is sent to the backend. If the backend
confirms success, it atomically clears all staged changes; the discard
response itself carries no graph payload. The tool then returns to View
mode, and the View-mode session fetches the components for the currently
selected use cases fresh from the backend and renders them. If the discard
instead fails — the backend reports `success: false`, or the request never
completes (network error, timeout, thrown exception) — an error toast is
shown and the session remains in Edit mode with staged changes intact; the
user may retry Discard. If the user closes the project the same discard flow
is triggered — if the user cancels the confirmation, or the discard request
fails, the project-close itself is aborted: the project remains open, the
tab stays in Edit mode, and staged changes remain intact.

**FR-LIFECYCLE-03** The **"Edit"** button is always visible in View
mode. It is disabled with an explanatory tooltip when the Discovery Wizard or
Diff/Merge view is active.

---

### 3.16 Canvas interaction

**FR-CANVAS-01** Users can **multi-select** nodes by Shift+clicking or by
rubber-band drag-select on the canvas. Multi-select is available in **both View
and Edit modes**. In Edit mode, a batch Delete operation applies to all selected
nodes and edges simultaneously. Cascades apply per node type (see FR-CTXMENU-01) —
if a parent and child are both selected, the child delete is handled as part of
the parent cascade and is not issued as a separate operation.

**FR-CANVAS-02** A batch Delete operation issues one backend call per cascade
root, independently. If some roots succeed and others fail, the successful
deletes are reflected on the canvas and a single toast reports partial
success (e.g., "N of M deletions succeeded"); the failed roots' details are
written to the log rather than enumerated in the toast. The canvas is never
rolled back for the roots that did succeed.

---

### 3.17 Enhancements

**FR-ENH-01** The backend returns a `changeId` with each successful staged edit
response.

**FR-ENH-02** *(Deferred to a future enhancement once its own requirements
are defined.)* The frontend
maintains a `changeId` stack and exposes undo/redo via a change history
panel in edit mode.

> **Open design problem:** Session-local palette subgraph placements have no
> backend `changeId`. Including them in the undo/redo stack requires either a
> client-side undo layer or staging palette drops to the backend on drop. This
> must be resolved before the undo/redo milestone is planned.

**FR-ENH-03** *(Deferred to a future enhancement, same treatment as
FR-ENH-02.)* Context menus on nodes and
edges can be replaced with inline **quick actions** — icon buttons that
appear on hover or selection — to reduce the number of right-click
interactions required for common operations.

**FR-ENH-04** *(Deferred to a future enhancement, same treatment as
FR-ENH-02/FR-ENH-03.)* User can copy and paste
one or more components at the same hierarchy level. When multiple components
are selected, all connections between the selected components are
automatically included in the paste. Pasted components are placed at the
current canvas viewport center or cursor position.

**FR-ENH-05** *(Deferred alongside
FR-ENH-04.)* User can copy components from one hierarchy level (e.g., inside a
subsystem) and paste them at a different level (e.g., outside the subsystem or
into a different subsystem). Connections between the copied components are
replicated in the target context where valid. Connections to components outside
the copied selection are not carried over.

> **Copyable node types (for when this is picked up):** FR-ENH-04/FR-ENH-05 apply to
> modules, containers, and **subgraphs**. Pasting a subgraph creates a
> brand-new backend subgraph populated with the copied contents (containers,
> modules, internal links) — it does not reference or alias the original
> subgraph. The pasted subgraph has the same provenance as any other
> session-created subgraph (see FR-MOD-03/FR-SG-10). Subsystems are not a
> copyable unit — they only appear in these requirements as the *context*
> pasted into or out of. Paste-target validation is not defined by this
> document: FR-MOD-08/FR-SG-11 do not reject drops based on the target
> underneath, and whichever future pass picks up copy/paste needs to decide
> paste-target rules on their own terms.

---

## 4. Invariants

**I1 — No optimistic mutation:** No structural mutation (module/subgraph/
container/subsystem/link add, delete, rename, port-count change, move) is
ever reflected on the canvas before the backend confirms it. Failure always
leaves the canvas unchanged and shows an error toast. (See FR-MOD-02,
FR-SG-07/08, FR-CONT-01, FR-LINK-01, FR-SUBSYS-01/02/06, FR-PORT-01–05.)

**I2 — Server as final arbiter of structural validity:** Client-side checks
(port-type compatibility, self-nesting exclusion) are eager conveniences, not
authoritative — the backend is always the final arbiter of whether a link,
move, or port-count change is valid (FR-LINK-05/06, FR-PORT-03, FR-SUBSYS-01).

**I3 — Removing from a subsystem never deletes it:** Removing a subgraph or
subsystem from a parent subsystem (FR-SUBSYS-05) re-parents the node one
level up but never deletes the now-possibly-empty subsystem shell as a side
effect. Subsystem deletion is always a separate, explicit action
(FR-SUBSYS-02) and only ever succeeds on an already-empty subsystem
(FR-SUBSYS-04).

**I4 — Provenance determines subgraph delete cost, except when staged child
edits exist:** A subgraph's delete behavior (UI-cache-only vs. a staged
backend cascade) is determined by its provenance — palette-placed,
pre-loaded, or newly-created (FR-SG-06/07/08) — with one exception: a
palette-placed subgraph with any staged child module/link falls back to the
same backend cascade a pre-loaded/newly-created subgraph always uses (per
FR-SG-06), since UI-cache-only removal would silently orphan
already-committed backend state.

---

## 5. Non-Functional Requirements

No performance, accessibility, or scale targets beyond what is already
stated as functional requirements are defined for this feature. Detailed
performance/scalability treatment (mutation serialization, batch-delete
concurrency, reconciliation cost) is a design-level concern — see
[design.md §13](design.md#13-performancescalability-considerations).

---

## 6. Out of Scope

- **Undo/redo** (FR-ENH-02) — deferred to a future enhancement once its own
  requirements are defined.
- **Inline quick actions** (FR-ENH-03) — deferred alongside undo/redo.
- **Copy/paste, same hierarchy level** (FR-ENH-04) and **copy/paste across
  hierarchy levels** (FR-ENH-05) — deferred; see FR-ENH-04/FR-ENH-05's note
  on copyable node types for future reference.
- **Offload to other DSP** (FR-MDF-03) — no backend endpoint exists today and
  none is currently planned.
- **The subsystem-level/use-case-level display-mode toggle itself** —
  FR-PAL-01 depends on this pre-existing, cross-cutting concept, but building
  the toggle's own state/UI/canvas-filtering logic is out of scope here.
- **Discovery Wizard and Diff/Merge as real features** — this feature only
  adds the exclusive-lock hook they will acquire from their own mount
  lifecycle once built (FR-LIFECYCLE-01); neither is implemented here.
- **Position/layout-override backend persistence mechanism** (FR-POS-02) —
  left to a future backend-team decision.

---

## 7. Open Questions

**OQ-1:** Position persistence — mechanism for persisting layout overrides
(FR-POS-02) outside the staged-edit workflow.

**OQ-2:** Connection-in-progress vs. concurrent mutation — FR-LINK-01/
FR-PORT-06's two-click connection flow keeps `connectionInProgress` entirely
inside the Visualizer's own internal state, outside `EditSessionSlice`/
`isMutating` (`link-and-port-design.md`). Nothing prevents the user from
starting a connection from a port, then deleting the module that owns that
port (or any other node) before completing the connection. This is expected
to self-resolve — the eventual connection-completion call is rejected
server-side (or has no valid target to complete against) and follows the
standard toast pattern — but is flagged here as a known interaction gap, not
a resolved one.
