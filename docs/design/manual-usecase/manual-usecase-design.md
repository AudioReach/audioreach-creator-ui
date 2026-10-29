# Manual Usecase Design

Requirements: [requirements.md](./requirements.md)

**Date:** 2026-10-28
**Status:** Approved design

## 1. Decision

Compose a session-local manual-usecase slice into GraphDesignerStore. It holds
the selected subgraphs, data links, and control links in one serializable
boundary, so subsystem navigation preserves membership and cascade cleanup is
atomic.

Rejected alternatives:

1. Reuse excluded-links state: it is the inverse of explicit inclusion.
2. Infer links from graph edits at Apply: manual topology must remain
   explicitly user-controlled.

## 2. Store

**New file:**
packages/react-app/src/features/graph-designer/model/manual-usecase-slice.ts

~~~ts
interface ManualUsecaseSlice {
  manualControlLinksById: Record<string, ManualLinkSelection>;
  manualDataLinksById: Record<string, ManualLinkSelection>;
  manualSubgraphsById: Record<string, SubgraphKvSelectionDto>;
  addManualLink: (link: ManualLinkSelection) => void;
  addManualSubgraph: (selection: SubgraphKvSelectionDto) => void;
  clearManualUsecase: () => void;
  removeManualLink: (kind: 'control' | 'data', id: string) => void;
  removeManualSubgraph: (id: string) => void;
}

interface ManualLinkSelection {
  destinationSubgraphSystemId: string;
  linkKind: 'control' | 'data';
  sourceSubgraphSystemId: string;
  systemId: string;
}
~~~

Record keys are system IDs and adds replace an existing key. addManualLink
accepts only links whose endpoint subgraphs are selected. removeManualSubgraph
also removes stored incident links. Link removal leaves its endpoints selected.
Each mutation marks the graph dirty and logs action and component context.
clearManualUsecase resets all three records.

## 3. API and request builder

**New DTO:**
packages/react-app/src/entities/edit-session/model/create-manual-usecases.dto.ts

~~~ts
interface CreateManualUsecasesRequestDto {
  activeSubgraphs: SubgraphKvSelectionDto[];
  includedControlLinkSystemIds: string[];
  includedDataLinkSystemIds: string[];
}
~~~

Export the DTO and createManualUsecases(projectId, body) from
entities/edit-session. The client posts to
/projects/{projectId}/create-manual-usecases.

**New builder:**
packages/react-app/src/features/graph-designer/lib/build-create-manual-usecases-request.ts

| Cache state | Request field |
| --- | --- |
| Object.values(manualSubgraphsById) | activeSubgraphs |
| Object.keys(manualDataLinksById) | includedDataLinkSystemIds |
| Object.keys(manualControlLinksById) | includedControlLinkSystemIds |

Both link arrays are required, including when empty. The builder validates the
endpoint invariant defensively and refuses an inconsistent request rather than
dropping a selected link.

## 4. Reused graph-item quick actions

**Modified file:**
packages/react-app/src/widgets/graph-designer/lib/context-menu-config.ts

Reuse the existing `MANUAL_USECASE_ACTIONS` action IDs and
`MANUAL_USECASE_ITEMS` toolbar items. Do not add link-specific action IDs,
another menu, or a second set of visualizer events. Extend the existing
`onAddToManualUsecase` and `onRemoveFromManualUsecase` Graph Designer callback
placeholders so their existing `onAction(actionId, target)` dispatch receives
the current subgraph or link target and routes it to the manual-usecase slice.

The existing node and edge toolbar components already obtain their items and
dispatch the target through `buildContextMenuConfig`; the configuration adds
the existing actions to data-link, control-link, proxy-data-link, and
proxy-control-link targets as well as subgraph targets. Link membership uses
the canonical link system ID, so the direct and proxy representations share
one add/remove state.

For an unselected link, the reused Add action remains visible but is disabled
until both endpoint subgraphs are selected. Its tooltip explains that both
endpoint subgraphs must be added first. A selected link exposes the reused
Remove action. The handler obtains the link kind, system ID, and endpoint
subgraph IDs from the target before calling the slice; it does not introduce a
separate link event API. The same tab store supplies state at every subsystem
level. No selection count, list, or panel is added.

## 5. Apply and review

The existing Apply coordinator reads manual selection. If normal graph
reconciliation is also required, it runs first because both endpoints write to
the active session. It then calls the manual endpoint only if a subgraph is
selected. Manual-only work does not call graph reconciliation; graph-only work
does not call manual creation.

A failure from creation, staging, commit, or session finalization is a hard
barrier. It preserves edit mode and manual selection, publishes issues, and
prevents later calls in the attempt. Successful creation responses join the
existing ApplySummaryDialog review payload. Manual rows are checked initially;
unchecked change IDs are omitted from stageChanges.

The finalization order remains:

~~~text
stageChanges -> commitChanges -> endSession -> reload -> exitEditMode
~~~

Clear manual selection only after confirmed terminal Apply or Discard.

## 6. Verification

| Area | Coverage |
| --- | --- |
| Manual slice | add/remove, deduplication, endpoint validation, cascade cleanup, clear |
| Request builder | exact body, required empty arrays, invariant failure |
| Entity client | endpoint and request body |
| Existing toolbar configuration | reused add/remove actions for every item kind, disabled link action, target-aware handler dispatch |
| Apply coordinator | endpoint conditions/order, error barrier, review, terminal cleanup |

Mock the shared logger in rendered suites. Assert failures preserve edit mode and
manual selection.
