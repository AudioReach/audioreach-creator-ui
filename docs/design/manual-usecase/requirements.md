# Manual Usecase: Requirements

**Date:** 2026-10-28
**Status:** Frozen

## Context

Users compose manual usecases by explicitly selecting subgraphs, data links,
and control links. The selection is session-local background state: it is not a
panel, count, or independent selected-items list.

The feature builds on the existing graph-item toolbar quick actions, their
Graph Designer add/remove handler placeholders, Apply/Discard session controls,
and POST /arc-api/v1/projects/{projectId}/create-manual-usecases. It does not
introduce another menu, action identifier, handler family, panel, count, or
selected-items list.

## API contract

The request always contains:

| Field | Source |
| --- | --- |
| activeSubgraphs | Selected subgraphs, including their SGKV combinations |
| includedDataLinkSystemIds | Selected data-link IDs; an empty array when none |
| includedControlLinkSystemIds | Selected control-link IDs; an empty array when none |

Each submitted link must exist, must not have been deleted in the session, and
must have both endpoint subgraphs in activeSubgraphs. Submitted data links must
not form a directed cycle. Control links augment topology but cannot create a
usecase alone. The response changes, issues, and groupId remain the source for
review and error presentation.

## Functional Requirements

### Selection

**FR-MUC-01 — Reused quick-action state:** Reuse the existing Add to Manual
Usecase and Remove from Manual Usecase toolbar action identifiers and Graph
Designer handler placeholders for subgraphs, data links, and control links. An
eligible unselected item shows add (+); a selected item shows remove (-).

**FR-MUC-02 — Subgraph selection:** Selecting a subgraph's add action stores
its current SGKV selection. Selecting its remove action removes it.

**FR-MUC-03 — Link selection:** Selecting a data-link or control-link add
action stores that link. The action is enabled only after both endpoint
subgraphs are selected; otherwise it remains visible but disabled with a
tooltip explaining the prerequisite.

**FR-MUC-04 — Cascade cleanup:** Removing a selected subgraph also removes all
selected data and control links incident to it. Removing a selected link does
not remove either endpoint subgraph.

**FR-MUC-05 — Navigation:** The selection persists during the edit session and
while navigating into or out of subsystems. Every remounted graph item,
including a proxy representation of a selected link, reflects its retained
add/remove state.

### Apply and review

**FR-MUC-06 — Request:** When Apply is selected and at least one subgraph is
selected, call the manual-usecase API with the exact selected subgraphs,
data-link IDs, and control-link IDs.

**FR-MUC-07 — Endpoint coverage:** Do not submit a selected link unless both
endpoint subgraphs are active.

**FR-MUC-08 — Empty selection:** When no subgraph is selected, do not call the
manual-usecase API.

**FR-MUC-09 — Failure barrier:** On any Apply backend error, present returned
issues and retain edit mode and selection. Do not stage, commit, end the
session, clear the cache, or invoke a later API in that attempt.

**FR-MUC-10 — Review:** Show reviewable API changes in a Manual Usecases
section. Each row is checked initially; unchecked rows are omitted from commit.

**FR-MUC-11 — Terminal cleanup:** Clear all manual selection after successful
Apply or Discard only.

## Invariants

- **I1 — Quick-action accuracy:** Add means absent; remove means selected.
- **I2 — Endpoint coverage:** Every selected link has both endpoint subgraphs
  selected.
- **I3 — Hidden cache:** The cache is never rendered independently.
- **I4 — Navigation:** Navigation does not change selection membership.
- **I5 — Terminal cleanup:** Only successful Apply or Discard empties the
  cache.

## Non-Functional Requirements

- Quick-action state updates immediately after a change.
- Duplicate subgraph and link entries are prevented.
- Selection changes and failures are logged with action and component context.
- Controls use existing QUI components, design tokens, and keyboard-accessible
  interactions.
