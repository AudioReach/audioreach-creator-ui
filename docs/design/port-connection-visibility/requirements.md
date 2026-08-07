# Port Connection Visibility — Requirements

> Design: [design.md](design.md)

---

## Feature Overview and Strategic Fit

A user working in the graph designer needs to know, at a glance, whether
a module port's connections are fully visible on canvas — and when
they're not, needs a way to see what's hidden without leaving the graph.
This design covers both halves of that one capability:

- **Port coloring.** Module ports (data and control) are colored
  according to how fully the connections visible in the currently-selected
  usecases (`activeLinks`) cover the backend's authoritative total
  connection count for that port (`totalLinksAtPort`): no connections at
  all (the `--color-background-neutral-00` token), fully covered (the
  `--color-background-neutral-10` token), or partially covered (the
  `--color-background-neutral-06` token) — the backend knows of more
  connections than are currently active in the selection. Each token
  resolves to the correct color for the active QUI theme automatically;
  no separate light/dark-specific logic is needed.
- **Port Connections Information popup.** Because the graph canvas only
  draws edges for the currently-loaded usecase selection, a
  partially-covered port is exactly the case where a user can't see
  everything at that port from the canvas alone. A right-click **"Show
  all connections"** action — gated on that same partial-coverage state —
  opens a modal listing every connection at the port, its other-end
  module, and the usecases each connection belongs to, letting the user
  fold newly-discovered usecases into the graph's current selection or
  jump straight to them.

The popup is a direct consumer of the coloring design's data: it exists
_because_ coloring already tells the user "there's more here than you can
see," and it reuses coloring's own `activeLinks`/`totalLinks` fields as
its trigger condition, so the two are documented together as one feature.

**Port coloring covers only the pure coloring function and the minimal
plumbing it depends on** (requirements #1–#8) — live recoloring during an
active edit session is deferred to a separate, concurrent work stream
(visualizer event-wiring); see Future Enhancements. Everything below the
Component Design section (see [design.md](design.md)) for port coloring
assumes Readonly mode only.

---

## Assumptions

**Port coloring:**

- The backend remains the sole source of truth for `totalLinksAtPort` —
  this design never derives that value client-side by scanning link
  arrays. `activeLinks` is the deliberate, derived
  client-side by scanning `UsecaseGraphData.connections`, already scoped
  to the selected usecases.
- `activeLinks` never exceeds `totalLinksAtPort` by design.
  Should backend/client drift ever violate this transiently,
  `portFillClass` treats `activeLinks <= totalLinks` as fully covered
  rather than failing or rendering an undefined state.
- `Connection.fromPortId`/`toPortId` and the module `Port`'s numeric `id`
  field reference the same id space — this design proceeds on that
  existing contract holding, as it already does today.
- Live-updating `activeLinks`/`totalLinks` during Edit mode is owned by a
  separate, concurrent work stream (visualizer event-wiring) — this
  design defines the data shape that work extends, not the wiring itself.
- Port coloring applies to module ports only; `SubsystemNode`/
  `SubgraphProxyNode` ports keep their existing fixed fill color
  unconditionally.

**Port Connections Information popup:**

- The context-menu gate triggers only when `activeLinks < totalLinks` on
  the right-clicked port — the port is partially covered, with
  connections the backend knows about that aren't represented in the
  current usecase selection.
- "Edit mode" for button gating means the visualizer's `VISUALIZER_MODE`
  (`EDIT`/`READONLY`)
- Self vs. other-end resolution is uniform across data and control
  links. `link.sourceId`/`link.destinationId` are systemIds; whichever
  matches `componentSystemId` is self, the other side is the other end.
- Other-end Module Id/Name/Port Id and Subgraph Id require two
  additional lookups, not values read off the link. A
  batched `getModulesBySystemIds` call (`POST /spf-modules/query`, reusing
  `entities/usecases`'s `SpfModuleDto` shape) resolves Module Id/Name/Port
  Id from the other-end module's systemId; Subgraph Id need a
  further match against `graph-designer.tsx`'s `subgraphList`, since
  `SpfModuleDto.subgraphId` is itself a subgraph systemId, not a display
  id (requires `SubgraphDefinition`/`SubgraphDto` to gain `systemId`).
  This is one additional batched request per popup open, not per row.
- Checked usecases **persist per row** for the lifetime of an open popup —
  switching the selected table row does not clear previously-checked
  usecases for other rows, so a user can build a cross-row selection
  before clicking Add/Navigate. The full accumulated set resets only when
  the popup closes or is reopened via a fresh `open()` call.
- The Advanced-details toggle (Module Id, Subgraph Id columns) is a pure
  rendering concern — local `useState` in
  `port-connections-info-popup.tsx`, off by default, reset to off on
  every fresh `open()` (same reset mechanism already documented above for
  checked usecases). It never gates data fetching or field resolution:
  `buildConnectionRows` always resolves `moduleId`/`subgraphSystemId` for
  every row regardless of toggle state, so the `iid:`/`sg:` search
  prefixes (requirement #22) keep matching even while their columns are
  hidden.

---

## Requirements

| #   | Title                                   | User Story                                                                                                                                                                                                                                                                                                                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Coloring rule                           | As a user viewing the graph, I want each port's color to reflect how fully its currently-active connections (from the selected usecases) cover the backend's total known connections at that port, with only the port's fill/background color changing.                                                                                             | `totalLinks === 0` → `--color-background-neutral-00`. `activeLinks <= totalLinks` (and `totalLinks > 0`) → `--color-background-neutral-10`. `activeLinks < totalLinks` → `--color-background-neutral-06`. Tokens resolve automatically per the active QUI theme (light/dark). No other port state affects this mapping.                                                                                                                                                                                                                                                |
| 2   | Applies to data and control ports       | As a user, I want both data ports and control ports on a module to follow the same coloring rule.                                                                                                                                                                                                                                                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 3   | Static counts in Readonly mode          | As a user in Readonly mode, I want port color fixed from the last-loaded `totalLinks` and `activeLinks`.                                                                                                                                                                                                                                            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 4   | Menu item gating on connection coverage | As a user, I want the "Show all connections" context menu item to appear on a port only when the backend knows of connections not represented in my current usecase selection, so I'm not offered an action with nothing new to show.                                                                                                               | Item is omitted (not disabled) when `activeLinks <= totalLinks`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5   | Menu item scoped to ports only          | As a user, I want "Show all connections" to appear only when right-clicking a port, not a module, subsystem, container, subgraph, or edge.                                                                                                                                                                                                          |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 6   | Menu action opens the popup             | As a user, clicking "Show all connections" should open the **Port Connections Information** popup, which shows the modules, subgraphs, and usecases where this port is connected but not currently active on the canvas.                                                                                                                            | Popup title: "Port Connections Information".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7   | Loading state                           | As a user, I want a loading indicator while the port's connections are being fetched — a full-screen overlay before the popup opens, and an in-popup indicator over the table/checklist area for the second-stage lookup once the popup is already open.                                                                                            | First-stage (link-list) fetch: `graph-designer.tsx`-level overlay via `createPortal`, matching `editor-shell.tsx`'s "Saving…" pattern (`ProgressRing` + label, `z-[9999]`, blurred backdrop). Second-stage (batched module lookup): popup is already open at this point — indicator replaces the table area only.                                                                                                                                                                                                                                                      |
| 8   | Error state                             | As a user, if fetching the port's connections fails, I want to be told clearly without being shown a stale or broken popup.                                                                                                                                                                                                                         | First-stage (link-list) failure: popup never opens; a toast (`showToast(message, 'danger')`) reports the failure. Second-stage (batched module lookup) failure: the popup is already open — an inline error message replaces the table/checklist area, and Add/Navigate are disabled (Cancel remains enabled).                                                                                                                                                                                                                                                         |
| 9   | Modal behavior                          | As a user, I want the popup to block interaction with the rest of the graph designer while it's open.                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 10  | Table columns                           | As a user, I want each row to show the other end's Port Id, Module Name, and the link's Connection Type by default.                                                                                                                                                                                                                                 | Resolved via the batched module lookup and the graph designer's subgraph-list lookup. Port Id shown in hex. Module Id and Subgraph Id are not shown by default.                                                                                                                                                                                                                                                                                                                                                                                                        |
| 11  | Advanced-details toggle                 | As a user, I usually only need Port Id and Module Name to identify a connection; as an advanced user, I want a toggle to additionally reveal Module Id and Subgraph Id when I need them.                                                                                                                                                            | QUI `Switch`, off by default, in the popup toolbar alongside the filter and search box — same pattern as `showPids`/`showRanges`/`showBadges` in `features/generic-tree-view/ui/components/toolbar.tsx`. Off → only Port Id/Module Name/Connection Type columns render. On → Module Id and Subgraph Id columns also render. Purely a rendering concern: never gates or defers any fetch, and never affects `sg:`/`iid:` search matching (requirement #23) even while its columns are hidden. Resets to off on every fresh popup `open()` — not persisted across opens. |
| 12  | Self/other resolution                   | As a developer, I want the table to always show the "other end" of a link for both data and control links.                                                                                                                                                                                                                                          | `link.sourceId`/`link.destinationId` (systemIds) are compared against `componentSystemId`; whichever side does not match is the other end.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 13  | Row selection                           | As a user, I want to select exactly one row at a time, which drives the usecase checklist below it.                                                                                                                                                                                                                                                 | Matches visual reference's single highlighted row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 14  | Filter control                          | As a user, I want a segmented control that lets me narrow the table to All, Subgraph, or Dangling connections.                                                                                                                                                                                                                                      | Implemented via QUI `SegmentedControl` (`SegmentedControl.Root`/`SegmentedControl.Item`), matching the existing Basic/Advanced toggle pattern in `features/generic-tree-view/ui/components/toolbar.tsx`. Renamed "SG" → "Subgraph" for clarity.                                                                                                                                                                                                                                                                                                                        |
| 15  | Filter application                      | As a user, selecting Subgraph or Dangling should narrow the table to matching rows; selecting All restores every row.                                                                                                                                                                                                                               | Subgraph: `isDangling === false`. Dangling: `isDangling === true`. Exactly one segment active at a time (QUI `SegmentedControl` semantics).                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 16  | Filter interaction with row selection   | As a user, if my selected row is filtered out, I want my row selection and checked usecases to remain intact rather than being cleared, so switching the filter back restores exactly what I had.                                                                                                                                                   | The filter only changes which rows are _visible_ — it never mutates selection or checklist state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 17  | Checklist rendering                     | As a user, I want to see the usecases belonging to the currently-selected row's link as a checklist below the table.                                                                                                                                                                                                                                | Empty when no row is selected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 18  | Checklist selection state               | As a user, I want to check/uncheck usecases — individually, or via a select-all/deselect-all control — to build the set that Add/Navigate will act on across all rows I've reviewed.                                                                                                                                                                | Checked usecases persist per row for the lifetime of the open popup (`Map<rowSystemId, usecases>`); switching rows does not clear other rows' checked state. The full accumulated map resets only when the popup closes or is reopened via a fresh `open()`.                                                                                                                                                                                                                                                                                                           |
| 19  | Button visibility and enablement        | As a user, I want Add, Navigate, and Cancel always visible; Add/Navigate enabled based on visualizer mode, and Cancel always enabled regardless of mode.                                                                                                                                                                                            | Readonly: all three enabled. Edit: only Cancel enabled. Requires `graph-designer.tsx` to read the visualizer's current `VisualizerMode`.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 20  | Add to selected usecases                | As a user, I want checked usecases merged into the graph's current selection without removing what's already selected.                                                                                                                                                                                                                              | Formatted via `formatUsecaseDisplay`; writes to `selectedUsecases` via `setSelectedUsecases`; popup closes. Make sure to check for the duplicates before merging the selected usecases                                                                                                                                                                                                                                                                                                                                                                                 |
| 21  | Navigate to selected usecases           | As a user, I want checked usecases to replace the graph's current selection so I jump straight to them.                                                                                                                                                                                                                                             | Same formatting/writing as Add, but replaces rather than merges. Operates on the full accumulated checklist selection across all reviewed rows.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 22  | No usecases checked                     | As a user, if I click Add or Navigate with nothing checked across any row, I expect a predictable no-op rather than an error.                                                                                                                                                                                                                       | Add: selection unchanged. Navigate: selection becomes empty. Popup still closes either way.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 23  | Search-box filtering                    | As a user, I want the search box to filter the table by other-end Subgraph Id, Module Id, or Module Name, so I don't have to scroll to find a specific row — even while those columns are hidden by the Advanced-details toggle. Typing a plain string (no prefix) should filter across Module Name without requiring me to know the prefix syntax. | Prefixes: `sg:` (Subgraph Id, e.g. `sg: 0xB0000008`), `iid:` (Module Id, e.g. `iid: 0x4023`), `mod:` (Module Name, e.g. `mod: Data Logging`). A plain string with no prefix matches Module Name as a case-insensitive substring. Local filtering only — never triggers a re-fetch. Matching is independent of the Advanced-details toggle.                                                                                                                                                                                                                             |

### Future Enhancements

Live recoloring during an active edit session — connecting/disconnecting
an edge immediately updates the affected ports' colors — is owned by a
separate, concurrent work stream (visualizer event-wiring), not this
design. Tracked here for traceability; numbers are stable identifiers
used elsewhere in this document.

| #   | Title                               | User Story                                                                                                                     | Notes                                             |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1   | Live counts in Edit mode            | As a user in Edit mode, I want connecting/disconnecting an edge to immediately recolor the affected ports.                     | Owned by a separate work stream, not this design. |
| 2   | Live count on connect               | As a user, connecting an edge should increment `activeLinks` for both the source port and the target port by 1.                | Owned by the same deferred work stream.           |
| 3   | Live count on edge delete           | As a user, deleting an edge should decrement `activeLinks` for both of its endpoints by 1.                                     | Owned by the same deferred work stream.           |
| 4   | Live count reseeds per edit session | As a developer, I want `activeLinks` (and `totalLinks`) seeded fresh from `graphData`'s values each time Edit mode is entered. | Owned by the same deferred work stream.           |
| 5   | Discard reverts counts              | As a user, discarding an edit session should revert port colors to the backend-committed state.                                | Owned by the same deferred work stream.           |

---

## Questions

**Port coloring:**

- **`totalLinks`/`activeLinks` increment semantics on connect/disconnect.**
  Does `totalLinks` need an optimistic client-side increment alongside
  `activeLinks`? Owned by the visualizer event-wiring work stream.
- **`onNodesDeleted` → incident-edge derivation.** Deleting a module
  implicitly removes all edges connected to it; the mechanism for
  deriving which edges were implicitly removed needs team discussion.
  Owned by the same work stream.
- Whether `SubsystemNode`/`SubgraphProxyNode` ports will ever receive
  real `totalLinks`/`activeLinks` values, and whether
  `showLinkCountColor` should then be revisited. Not blocking.

**Port Connections Information popup:**

- **OQ-1 — RESOLVED.** Backend convention for control-link self/other
  resolution. Resolved by comparing `sourceId`/`destinationId` systemIds
  against `componentSystemId`.
- **OQ-2 — RESOLVED.** Checked usecases persist per row for the lifetime
  of an open popup (row switches don't clear them); the full set resets
  only on close or a fresh popup `open()`.
- **OQ-3 — RESOLVED (superseded).** `link.id`/`name`/`parentId` do not
  represent the other-end module — superseded by the batched module
  lookup.
- **OQ-4 (informational).** `ControlPortDto.totalLinksAtPort` absence
  means the menu item never appears on control ports until port
  coloring's backend dependency ships.
- **OQ-5 - RESOLVED (blocking).** Confirm the actual mechanism
  `graph-designer.tsx` will use to read the visualizer's current
  `VisualizerMode` by implementation time. No such mechanism exists
  today.
- **OQ-6 — RESOLVED.** Module Id/Port Id still display via
  `ConvertNumberToHexString` — `SpfModuleDto.id` and the matched port's
  `id` remain numeric fields; only `subgraphId` was corrected to a
  systemId string.

---

## Not Doing

- Live count updates during Edit mode (`onEdgeConnected`/`onEdgesDeleted`
  wiring, session-local counters, seed/reset lifecycle) — separate,
  concurrent work stream (visualizer event-wiring); see Future
  Enhancements.
- Any change to `portStatus` semantics or its CSS hook.
- A visual legend/key or tooltip for the color meanings.
- Coloring `SubsystemNode` or `SubgraphProxyNode` ports.
- Any change to Static/Dynamic port semantics.
- Any change to the existing `DataLinkDto`/`ControlLinkDto` types.
- Any change to `entities/spf-module-data`'s existing `queryModuleIndices`
  function or its deliberately partial `SpfModuleDto` — the batched
  other-end module lookup is a new, separate function reusing
  `entities/usecases`'s own `SpfModuleDto` instead.
- Bulk row selection (selecting more than one table row at once) — the
  table's row selection stays single-select; only the checklist
  accumulates checked usecases across rows visited one at a time
  (requirement #18).
- Persisting the Advanced-details toggle as a sticky user preference
  across popup sessions — it always resets to off on a fresh `open()`,
  matching how the filter and search box already reset.
- Displaying Subgraph Name anywhere in the popup — only Subgraph Id (the
  hex display id) is shown, and only behind the Advanced-details toggle.
