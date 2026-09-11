/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useMemo, useRef, useState} from 'react';

import {Button} from '@qualcomm-ui/react/button';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import type {KeyDefinitionResponseDto} from '~entities/key-definitions';
import type {KvSelection} from '~entities/subgraph-definitions';
import ArcSearchBar from '~shared/controls/arc-search-bar';
import {logger} from '~shared/lib/logger';

import {
  applyKvVectorEditorSuggestion,
  formatKvVectorCandidate,
  formatKvVectorEditorInput,
  getAddKvVectorEligibility,
  getKvVectorEditorSuggestions,
  getKvVectorPairsForSelection,
  resolveKvVectorEditorInput,
  sortKvVectorPairsByDefinition,
  type KvVectorEditorSuggestion,
  type ValueOnlyPairOverride,
} from '../lib/add-kv-vector-editor';
import type {KvVectorEditorDiagnostic} from '../lib/kv-vector-editor-diagnostic';
import {
  getVisibleKvVectors,
  type SubgraphKvFilterState,
} from '../lib/kv-vector-filter';
import type {KvVectorDisplayMode} from '../lib/kv-vector-format';

import {KvVectorRow} from './kv-vector-row';
import {AddSgKvVectorEditor} from './add-sg-kv-vector-editor';
import {AddKvVectorSelectionPanel} from './add-kv-vector-selection-panel';

/**
 * Store-agnostic UI for one selected subgraph's vectors. The parent provides
 * View/Edit actions and persisted vectors; this component owns only browsing
 * controls and the temporary Add candidate shared by its two Add controls.
 */
/** Store-agnostic View/Edit UI contract for one subgraph's KV Vector section. */
export interface SubgraphKeyVectorConfigPanelProps {
  availableGraphKeys: KeyDefinitionResponseDto[] | null;
  displayMode: KvVectorDisplayMode;
  filters: SubgraphKvFilterState;
  isEditable: boolean;
  isMetadataPending?: boolean;
  onAdd?: (keyValuePairs: KvSelection['keyValuePairs']) => boolean;
  onDelete?: (vectorSystemId: string) => void;
  onFiltersChange: (filters: SubgraphKvFilterState) => void;
  onSelectionChange?: (vectorSystemId: string, selected: boolean) => void;
  subgraphSystemId: string;
  vectors: KvSelection[];
}

/** Coordinates browsing controls and the local candidate before a store mutation. */
export function SubgraphKeyVectorConfigPanel({
  availableGraphKeys,
  displayMode,
  filters,
  isEditable,
  isMetadataPending = false,
  onAdd = () => false,
  onDelete = () => undefined,
  onFiltersChange,
  onSelectionChange = () => undefined,
  subgraphSystemId: _subgraphSystemId,
  vectors,
}: SubgraphKeyVectorConfigPanelProps) {
  const [candidatePairs, setCandidatePairs] = useState<
    KvSelection['keyValuePairs']
  >([]);
  const [editorCaretPosition, setEditorCaretPosition] = useState(0);
  const [editorDiagnostic, setEditorDiagnostic] =
    useState<KvVectorEditorDiagnostic | null>(null);
  const [editorText, setEditorText] = useState('');
  const [hasValidCandidate, setHasValidCandidate] = useState(false);
  const [expandedKeySystemIds, setExpandedKeySystemIds] = useState<string[]>(
    [],
  );
  const [selectedKeySystemIds, setSelectedKeySystemIds] = useState<string[]>(
    [],
  );
  const [selectedValueSystemIdsByKey, setSelectedValueSystemIdsByKey] =
    useState<Record<string, string>>({});
  const [showAddControls, setShowAddControls] = useState(false);
  const [valueOnlyPairOverrides, setValueOnlyPairOverrides] = useState<
    ValueOnlyPairOverride[]
  >([]);
  const previousDisplayMode = useRef(displayMode);
  const visibleVectors = useMemo(
    () => getVisibleKvVectors(vectors, filters),
    [filters, vectors],
  );

  const updateFilters = (change: Partial<SubgraphKvFilterState>): void => {
    onFiltersChange({...filters, ...change});
  };

  const clearCandidate = (): void => {
    // The Editor and Selection Panel are two views of one local candidate.
    setCandidatePairs([]);
    setEditorCaretPosition(0);
    setEditorDiagnostic(null);
    setEditorText('');
    setHasValidCandidate(false);
    setExpandedKeySystemIds([]);
    setSelectedKeySystemIds([]);
    setSelectedValueSystemIdsByKey({});
    setValueOnlyPairOverrides([]);
  };

  const openAddControls = (): void => {
    clearCandidate();
    setShowAddControls(true);
  };

  const updateCandidateFromResolvedEditor = (
    text: string,
    resolved: ReturnType<typeof resolveKvVectorEditorInput>,
  ): void => {
    setEditorText(text);
    if (resolved.kind === 'incomplete' || resolved.kind === 'invalid') {
      // Invalid text must not leave a stale Selection Panel candidate addable.
      setCandidatePairs([]);
      setEditorDiagnostic(resolved.diagnostic);
      setHasValidCandidate(false);
      setSelectedKeySystemIds([]);
      setSelectedValueSystemIdsByKey({});
      return;
    }

    setEditorDiagnostic(
      resolved.kind === 'valid' ? (resolved.diagnostic ?? null) : null,
    );
    setHasValidCandidate(resolved.kind === 'valid');
    setCandidatePairs(resolved.keyValuePairs);
    setSelectedKeySystemIds(
      resolved.keyValuePairs.map((pair) => pair.keyInfo.keySystemId),
    );
    setSelectedValueSystemIdsByKey(
      Object.fromEntries(
        resolved.keyValuePairs.map((pair) => [
          pair.keyInfo.keySystemId,
          pair.valueInfo.valueSystemId,
        ]),
      ),
    );
    if (availableGraphKeys && resolved.kind === 'valid') {
      // Canonical text keeps editor and Selection Panel state on one identity set.
      setEditorText(
        formatKvVectorEditorInput(
          resolved.keyValuePairs,
          availableGraphKeys,
          displayMode,
          text.trimEnd().endsWith('+'),
        ),
      );
    }
  };

  const updateCandidateFromEditor = (text: string): void => {
    // Preserve a clicked choice only while its Value Only token is unchanged.
    const previousTokens = getValueOnlyTokens(editorText);
    const nextTokens = getValueOnlyTokens(text);
    const retainedOverrides =
      displayMode === 'value-only'
        ? valueOnlyPairOverrides.filter(
            (item) =>
              previousTokens[item.tokenIndex] === nextTokens[item.tokenIndex],
          )
        : [];
    setValueOnlyPairOverrides(retainedOverrides);
    updateCandidateFromResolvedEditor(
      text,
      resolveKvVectorEditorInput(
        text,
        availableGraphKeys,
        displayMode,
        retainedOverrides,
      ),
    );
  };

  const updateCandidateFromSuggestion = (
    suggestion: KvVectorEditorSuggestion,
  ): void => {
    const text = applyKvVectorEditorSuggestion(editorText, suggestion);
    if (
      suggestion.kind !== 'value-only' ||
      !availableGraphKeys ||
      !suggestion.valueSystemId
    ) {
      updateCandidateFromEditor(text);
      return;
    }

    const valueOnlyStart =
      editorText.lastIndexOf(']', suggestion.replacementRange.start - 1) + 1;
    const tokenIndex = editorText
      .slice(valueOnlyStart, suggestion.replacementRange.start)
      .split('+')
      .filter((token) => token.trim() !== '').length;
    const overrides = [
      ...valueOnlyPairOverrides.filter(
        (item) => item.tokenIndex !== tokenIndex,
      ),
      {
        keySystemId: suggestion.keySystemId,
        tokenIndex,
        valueSystemId: suggestion.valueSystemId,
      },
    ];

    setValueOnlyPairOverrides(overrides);
    updateCandidateFromResolvedEditor(
      text,
      resolveKvVectorEditorInput(
        text,
        availableGraphKeys,
        displayMode,
        overrides,
      ),
    );
  };

  const updateCandidateFromSelection = (
    keySystemIds: string[],
    valueSystemIdsByKey: Record<string, string>,
  ): void => {
    if (!availableGraphKeys) {
      return;
    }
    const pairs = getKvVectorPairsForSelection(
      availableGraphKeys,
      keySystemIds,
      valueSystemIdsByKey,
    );
    // Keep the candidate in selection order; Add restores definition order.
    setCandidatePairs(pairs);
    setEditorDiagnostic(null);
    setHasValidCandidate(pairs.length > 0);
    setEditorText(
      formatKvVectorCandidate(pairs, availableGraphKeys, displayMode),
    );
    setSelectedKeySystemIds(keySystemIds);
    setSelectedValueSystemIdsByKey(valueSystemIdsByKey);
    setValueOnlyPairOverrides(
      displayMode === 'value-only'
        ? pairs.map((pair, tokenIndex) => ({
            keySystemId: pair.keyInfo.keySystemId,
            tokenIndex,
            valueSystemId: pair.valueInfo.valueSystemId,
          }))
        : [],
    );
  };

  useEffect(() => {
    const didDisplayModeChange = previousDisplayMode.current !== displayMode;
    previousDisplayMode.current = displayMode;
    if (!didDisplayModeChange || !availableGraphKeys || !hasValidCandidate) {
      return;
    }

    // Changing display mode reformats the candidate without changing its pairs.
    setEditorText(
      formatKvVectorCandidate(candidatePairs, availableGraphKeys, displayMode),
    );
  }, [availableGraphKeys, candidatePairs, displayMode, hasValidCandidate]);

  const addCandidate = (): void => {
    if (
      !availableGraphKeys ||
      !hasValidCandidate ||
      !onAdd(sortKvVectorPairsByDefinition(candidatePairs, availableGraphKeys))
    ) {
      return;
    }
    // The session action owns duplicate detection and the stored-vector write.
    clearCandidate();
    setShowAddControls(false);
  };

  const cancelAdd = (): void => {
    clearCandidate();
    setShowAddControls(false);
  };

  const hasCompleteCandidate =
    availableGraphKeys !== null &&
    hasValidCandidate &&
    candidatePairs.length > 0 &&
    selectedKeySystemIds.length === candidatePairs.length &&
    selectedKeySystemIds.length > 0;
  const isDuplicateCandidate =
    hasCompleteCandidate && !getAddKvVectorEligibility(candidatePairs, vectors);

  const copyVector = async (text: string): Promise<void> => {
    // Copy is useful in both modes and never changes the staged vector state.
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      logger.error('Subgraph KV copy failed', {
        action: 'copy_kv_vector',
        component: 'SubgraphKeyVectorConfigPanel',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const addControls = isEditable && showAddControls && (
    <div className="border-neutral-02 flex shrink-0 flex-col gap-3 rounded border p-1.5">
      {availableGraphKeys && availableGraphKeys.length > 0 ? (
        <>
          <AddSgKvVectorEditor
            diagnostic={editorDiagnostic}
            onCaretPositionChange={setEditorCaretPosition}
            onSuggestionCommit={updateCandidateFromSuggestion}
            onTextChange={updateCandidateFromEditor}
            suggestions={getKvVectorEditorSuggestions(
              editorText,
              availableGraphKeys,
              editorCaretPosition,
              displayMode,
              valueOnlyPairOverrides,
            )}
            text={editorText}
          />
          <AddKvVectorSelectionPanel
            definitions={availableGraphKeys}
            expandedKeySystemIds={expandedKeySystemIds}
            onCollapseAll={() => setExpandedKeySystemIds([])}
            onExpandAll={() =>
              setExpandedKeySystemIds(
                availableGraphKeys.map((key) => key.systemId),
              )
            }
            onExpandedKeySystemIdsChange={setExpandedKeySystemIds}
            onSelectionChange={updateCandidateFromSelection}
            selectedKeySystemIds={selectedKeySystemIds}
            selectedValueSystemIdsByKey={selectedValueSystemIdsByKey}
          />
        </>
      ) : (
        <div className="text-neutral-secondary text-sm">
          No key and value definitions are currently available to create a KV
          vector.
        </div>
      )}
      <div className="flex items-center gap-3">
        {isDuplicateCandidate && (
          <div className="text-support-danger text-sm" role="alert">
            This KV vector already exists.
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            aria-label="Cancel adding KV vector"
            emphasis="neutral"
            onClick={cancelAdd}
            size="sm"
            variant="fill"
          >
            Cancel
          </Button>
          {hasCompleteCandidate && (
            <Button
              disabled={isDuplicateCandidate}
              emphasis="primary"
              onClick={addCandidate}
              size="sm"
              variant="fill"
            >
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-2">
      {addControls}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Tooltip
            trigger={
              <span className="block">
                <ArcSearchBar
                  onSearchChange={(searchText) => updateFilters({searchText})}
                  placeholder="Search KV vectors"
                  searchTerm={filters.searchText}
                />
              </span>
            }
          >
            Search KV vectors by key or value.
          </Tooltip>
        </div>
        {isEditable && !showAddControls && (
          <Tooltip
            trigger={
              <span>
                <Button
                  emphasis="primary"
                  onClick={openAddControls}
                  size="sm"
                  variant="fill"
                >
                  Add KV Vector
                </Button>
              </span>
            }
          >
            Create a KV vector for this subgraph.
          </Tooltip>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Tooltip
          trigger={
            <span className="text-neutral-secondary text-xs font-medium">
              Selection
            </span>
          }
        >
          Filter by whether the KV vector is selected.
        </Tooltip>
        <div
          aria-label="Selection filter"
          className="flex items-center gap-1"
          role="group"
        >
          {(
            [
              {label: 'Selected', value: 'selected'},
              {label: 'Unselected', value: 'unselected'},
            ] as const
          ).map(({label, value}) => (
            <Tooltip
              key={value}
              trigger={
                <span>
                  <Button
                    aria-pressed={filters[value]}
                    onClick={() => updateFilters({[value]: !filters[value]})}
                    size="sm"
                    variant={filters[value] ? 'fill' : 'outline'}
                  >
                    {label}
                  </Button>
                </span>
              }
            >
              {value === 'selected'
                ? 'Include selected KV vectors.'
                : 'Include unselected KV vectors.'}
            </Tooltip>
          ))}
        </div>
        <Tooltip
          trigger={
            <span className="text-neutral-secondary text-xs font-medium">
              Type
            </span>
          }
        >
          Filter by EC classification.
        </Tooltip>
        <div
          aria-label="Type filter"
          className="flex items-center gap-1"
          role="group"
        >
          <Tooltip
            trigger={
              <span>
                <Button
                  aria-pressed={filters.regular}
                  onClick={() => updateFilters({regular: !filters.regular})}
                  size="sm"
                  variant={filters.regular ? 'fill' : 'outline'}
                >
                  Regular
                </Button>
              </span>
            }
          >
            Include regular KV vectors.
          </Tooltip>
          <Tooltip
            trigger={
              <span>
                <Button
                  aria-pressed={filters.ec}
                  onClick={() => updateFilters({ec: !filters.ec})}
                  size="sm"
                  variant={filters.ec ? 'fill' : 'outline'}
                >
                  EC
                </Button>
              </span>
            }
          >
            Include EC KV vectors.
          </Tooltip>
        </div>
      </div>
      <div className="bg-primary border-neutral-02 min-h-0 flex-1 overflow-y-auto rounded border">
        {isMetadataPending ? (
          <div className="text-neutral-secondary p-4 text-center text-sm">
            Loading...
          </div>
        ) : vectors.length === 0 ? (
          <div className="text-neutral-secondary p-4 text-center text-sm">
            No KV vectors are assigned to this subgraph.
          </div>
        ) : visibleVectors.length === 0 ? (
          <div className="text-neutral-secondary p-4 text-center text-sm">
            No KV vectors match the active filters.
          </div>
        ) : (
          visibleVectors.map((vector) => (
            <KvVectorRow
              key={vector.systemId}
              displayMode={displayMode}
              isEditable={isEditable}
              onCopy={(text) => {
                void copyVector(text);
              }}
              onDelete={onDelete}
              onSelectionChange={onSelectionChange}
              vector={vector}
            />
          ))
        )}
      </div>
    </div>
  );
}

function getValueOnlyTokens(text: string): string[] {
  return text
    .slice(text.lastIndexOf(']') + 1)
    .trim()
    .split('+')
    .map((token) => token.trim())
    .filter((token) => token !== '');
}
