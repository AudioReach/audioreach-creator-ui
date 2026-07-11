/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import {logger} from '~shared/lib/logger';

import {buildLengthFormulaMap} from '../lib/build-length-formula-map';
import {buildMatchSets} from '../lib/build-match-sets';
import {findElementByKey} from '../lib/find-element-by-key';
import {isPolicyVisible} from '../lib/is-policy-visible';
import {itemIdsFromPaths} from '../lib/item-ids-from-paths';
import {parseHexOrDec} from '../lib/parse-hex-or-dec';
import {patchElements} from '../lib/patch-elements';
import {seedFromData} from '../lib/seed-from-data';
import type {TreeViewData, TreeViewItem} from '../model/tree-view-data';
import type {GenericTreeViewHandle, GenericTreeViewProps} from '../model/types';

import {LegacyView} from './components/legacy-view';
import {ParameterDetailPane} from './components/parameter-detail-pane';
import {ParameterListPanel} from './components/parameter-list-panel';
import {Toolbar} from './components/toolbar';
import {ViewSwitchOverlay} from './components/view-switch-overlay';

function GenericTreeViewInner(
  props: GenericTreeViewProps,
  ref: React.Ref<GenericTreeViewHandle>,
) {
  const {
    autoCommit,
    className,
    data,
    defaultPolicyFilter = ['BASIC'],
    defaultViewMode = 'modern',
    hideToolbar = false,
    initialUiState,
    onUiStateChange,
    readOnly = false,
    title,
  } = props;

  const [, startTransition] = useTransition();
  const [isExpanding, startExpandTransition] = useTransition();
  const [isSwitchingView, startViewTransition] = useTransition();
  const [pendingSwitch, setPendingSwitch] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<'legacy' | 'modern' | null>(
    null,
  );

  const [viewMode, setViewMode] = useState<'legacy' | 'modern'>(
    () => initialUiState?.viewMode ?? defaultViewMode,
  );

  const [elementValues, setElementValues] = useState<Map<string, string>>(
    () => {
      if (initialUiState) {
        return new Map(Object.entries(initialUiState.elementValues));
      }
      return seedFromData(data).elementValues;
    },
  );
  const [committedValues, setCommittedValues] = useState<Map<string, string>>(
    () => {
      if (initialUiState) {
        return new Map(Object.entries(initialUiState.committedValues));
      }
      return new Map(elementValues);
    },
  );
  const [arrayCounts, setArrayCounts] = useState<Map<string, number>>(() => {
    if (initialUiState) {
      return new Map(
        Object.entries(initialUiState.arrayCounts).map(([k, v]) => [k, v]),
      );
    }
    return seedFromData(data).arrayCounts;
  });

  const [dirtyPaths, setDirtyPaths] = useState<Set<string>>(() =>
    initialUiState ? new Set(initialUiState.dirtyPaths) : new Set<string>(),
  );
  const [setPaths, setSetPaths] = useState<Set<string>>(() =>
    initialUiState ? new Set(initialUiState.setPaths) : new Set<string>(),
  );
  const [invalidPaths, setInvalidPaths] = useState<Set<string>>(
    () => new Set(initialUiState?.invalidPaths ?? []),
  );
  const [resetKey, setResetKey] = useState(0);

  const lengthFormulaMap = useMemo(
    () => buildLengthFormulaMap(data.items),
    [data],
  );

  const prevDataRef = useRef<TreeViewData | null>(data);
  // Snapshot of dirty/set state as of the latest render, read inside the
  // effect below instead of via closure. dirtyPaths/setPaths/elementValues/
  // committedValues change on every edit; a ref lets the effect read their
  // current values (comparing what was sent vs. the merged snapshot, per
  // design.md §9.7) without listing them as deps, which would re-run the
  // effect on every edit instead of only on `data` changes.
  const latestUiStateRef = useRef<{
    committedValues: Map<string, string>;
    dirtyPaths: Set<string>;
    elementValues: Map<string, string>;
    setPaths: Set<string>;
  }>({committedValues, dirtyPaths, elementValues, setPaths});
  latestUiStateRef.current = {
    committedValues,
    dirtyPaths,
    elementValues,
    setPaths,
  };

  useEffect(() => {
    if (prevDataRef.current === data) {
      return;
    }
    prevDataRef.current = data;

    if (data.source === 'set') {
      logger.debug(`GenericTreeView: Set reconciliation (${data.systemId})`, {
        action: 'set-reconcile',
        component: 'GenericTreeView',
      });
      const {arrayCounts: ac, elementValues: mergedValues} = seedFromData(data);
      const {
        committedValues: prevCommittedValues,
        dirtyPaths: preSetDirtyPaths,
        elementValues: sentValues,
        setPaths: prevSetPaths,
      } = latestUiStateRef.current;

      const nextDirtyPaths = new Set(preSetDirtyPaths);
      const nextSetPaths = new Set(prevSetPaths);
      const nextElementValues = new Map(sentValues);
      const nextCommittedValues = new Map(prevCommittedValues);
      for (const path of preSetDirtyPaths) {
        const sentValue = sentValues.get(path);
        const mergedValue = mergedValues.get(path);
        if (mergedValue !== undefined && mergedValue === sentValue) {
          nextDirtyPaths.delete(path);
          nextSetPaths.add(path);
          nextElementValues.set(path, mergedValue);
          nextCommittedValues.set(path, mergedValue);
        }
      }

      setElementValues(nextElementValues);
      setCommittedValues(nextCommittedValues);
      setArrayCounts(ac);
      setDirtyPaths(nextDirtyPaths);
      setSetPaths(nextSetPaths);
      setResetKey((k) => k + 1);
      onUiStateChange?.({
        arrayCounts: Object.fromEntries(ac),
        committedValues: Object.fromEntries(nextCommittedValues),
        dirtyPaths: [...nextDirtyPaths],
        elementValues: Object.fromEntries(nextElementValues),
        setPaths: [...nextSetPaths],
      });
      return;
    }

    logger.debug(`GenericTreeView: data re-seed (${data.systemId})`, {
      action: 'data-re-seed',
      component: 'GenericTreeView',
    });
    const {arrayCounts: ac, elementValues: ev} = seedFromData(data);
    setElementValues(ev);
    setCommittedValues(new Map(ev));
    setArrayCounts(ac);
    setDirtyPaths(new Set());
    setSetPaths(new Set());
    setResetKey((k) => k + 1);
    onUiStateChange?.({
      arrayCounts: Object.fromEntries(ac),
      committedValues: Object.fromEntries(ev),
      dirtyPaths: [],
      elementValues: Object.fromEntries(ev),
      invalidPaths: [],
      setPaths: [],
    });
  }, [data, onUiStateChange]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialUiState?.selectedIds !== undefined) {
      return initialUiState.selectedIds;
    }
    const first = data.items.find((p) => !p.isHidden);
    return first ? [first.id] : [];
  });

  const [expandedIds, setExpandedIds] = useState<string[]>(() => {
    if (initialUiState?.expandedIds !== undefined) {
      return initialUiState.expandedIds;
    }
    const first = data.items.find((p) => !p.isHidden);
    return first ? [first.id] : [];
  });
  const [legacyExpandedKeys, setLegacyExpandedKeys] = useState<string[]>(
    () => initialUiState?.legacyExpandedKeys ?? ['__module__'],
  );
  const [legacyExpandAll, setLegacyExpandAll] = useState(false);
  const [modernExpandAll, setModernExpandAll] = useState(false);

  const [searchInput, setSearchInput] = useState(
    () => initialUiState?.searchText ?? '',
  );
  const [searchText, setSearchText] = useState(
    () => initialUiState?.searchText ?? '',
  );
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    },
    [],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(
        () =>
          startTransition(() => {
            setSearchText(value);
            onUiStateChange?.({searchText: value});
          }),
        150,
      );
    },
    [startTransition, onUiStateChange],
  );

  const [policyFilter, setPolicyFilter] = useState<Set<'BASIC' | 'ADVANCED'>>(
    () => {
      if (initialUiState) {
        return new Set(initialUiState.policyFilter);
      }
      return new Set(defaultPolicyFilter);
    },
  );

  const [showPids, setShowPids] = useState(
    () => initialUiState?.showPids ?? false,
  );
  const [showRanges, setShowRanges] = useState(
    () => initialUiState?.showRanges ?? false,
  );
  const [showBadges, setShowBadges] = useState(
    () => initialUiState?.showBadges ?? false,
  );
  const [showModifiedOnly, setShowModifiedOnly] = useState(
    () => initialUiState?.showModifiedOnly ?? false,
  );
  const [showErrorsOnly, setShowErrorsOnly] = useState(
    () => initialUiState?.showErrorsOnly ?? false,
  );

  const [panelSplitPct, setPanelSplitPct] = useState(
    () => initialUiState?.panelSplitPct ?? 30,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragPctRef = useRef(panelSplitPct);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleSplitterKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }
      e.preventDefault();
      const step = e.shiftKey ? 10 : 2;
      const delta = e.key === 'ArrowRight' ? step : -step;
      const next = Math.min(60, Math.max(20, panelSplitPct + delta));
      setPanelSplitPct(next);
      onUiStateChange?.({panelSplitPct: next});
    },
    [panelSplitPct, setPanelSplitPct, onUiStateChange],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(60, Math.max(20, pct));
      setPanelSplitPct(clamped);
      dragPctRef.current = clamped;
    };
    const onUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        onUiStateChange?.({panelSplitPct: dragPctRef.current});
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [onUiStateChange]);

  const handleValueChange = useCallback(
    (key: string, value: string) => {
      // Compute next state in locals so the emission below sees consistent
      // values (parallel setState calls with prev => ... don't compose).
      const nextElementValues = new Map(elementValues);
      nextElementValues.set(key, value);

      const committedVal = committedValues.get(key);
      const isDirty = value !== committedVal;
      const nextDirtyPaths = new Set(dirtyPaths);
      if (isDirty) {
        nextDirtyPaths.add(key);
      } else {
        nextDirtyPaths.delete(key);
      }

      const nextSetPaths = new Set(setPaths);
      nextSetPaths.delete(key);

      const itemId = key.split('/')[0];
      const item = data.items.find((p) => p.id === itemId);
      const nextInvalidPaths = new Set(invalidPaths);
      if (item) {
        const elem = findElementByKey(item.elements, itemId, [], key);
        if (
          elem &&
          isPolicyVisible(elem.policy, policyFilter) &&
          elem.min !== undefined &&
          elem.max !== undefined
        ) {
          const num = parseHexOrDec(value);
          if (!isNaN(num) && (num < elem.min || num > elem.max)) {
            nextInvalidPaths.add(key);
          } else {
            nextInvalidPaths.delete(key);
          }
        }
      }

      setElementValues(nextElementValues);
      setDirtyPaths(nextDirtyPaths);
      setSetPaths(nextSetPaths);
      setInvalidPaths(nextInvalidPaths);

      let nextArrayCounts = arrayCounts;
      const controlled = lengthFormulaMap.get(key);
      if (controlled) {
        const newCount = parseHexOrDec(value);
        if (!isNaN(newCount) && newCount >= 0) {
          const next = new Map(arrayCounts);
          let changed = false;
          for (const {arrayPath} of controlled) {
            if (arrayCounts.get(arrayPath) !== newCount) {
              next.set(arrayPath, newCount);
              changed = true;
            }
          }
          if (changed) {
            nextArrayCounts = next;
            setArrayCounts(next);
          }
        }
      }

      onUiStateChange?.({
        arrayCounts: Object.fromEntries(nextArrayCounts),
        dirtyPaths: [...nextDirtyPaths],
        elementValues: Object.fromEntries(nextElementValues),
        invalidPaths: [...nextInvalidPaths],
        setPaths: [...nextSetPaths],
      });
    },
    [
      data.items,
      arrayCounts,
      committedValues,
      dirtyPaths,
      elementValues,
      invalidPaths,
      lengthFormulaMap,
      onUiStateChange,
      policyFilter,
      setPaths,
    ],
  );

  const dirtyItemIds = useMemo(
    () => itemIdsFromPaths(dirtyPaths),
    [dirtyPaths],
  );

  const setItemIds = useMemo(() => itemIdsFromPaths(setPaths), [setPaths]);

  const invalidItemIds = useMemo(
    () => itemIdsFromPaths(invalidPaths),
    [invalidPaths],
  );

  const visibleItems = useMemo(
    () =>
      data.items.filter((item) => {
        if (item.isHidden) {
          return false;
        }
        if (showModifiedOnly && !dirtyItemIds.has(item.id)) {
          return false;
        }
        if (showErrorsOnly && !invalidItemIds.has(item.id)) {
          return false;
        }
        return true;
      }),
    [
      data.items,
      showModifiedOnly,
      showErrorsOnly,
      dirtyItemIds,
      invalidItemIds,
    ],
  );

  const buildDirtyItems = useCallback((): TreeViewItem[] => {
    if (dirtyPaths.size === 0) {
      return [];
    }
    return data.items
      .filter((item) =>
        [...dirtyPaths].some((k) => k.startsWith(`${item.id}/`)),
      )
      .map((item) => ({
        ...item,
        elements: patchElements(
          item.elements,
          item.id,
          [],
          elementValues,
          arrayCounts,
        ),
      }));
  }, [dirtyPaths, data.items, elementValues, arrayCounts]);

  const tryAutoCommit = useCallback(() => {
    if (!autoCommit || readOnly) {
      return;
    }
    if (dirtyPaths.size === 0 || invalidPaths.size > 0) {
      return;
    }
    logger.debug(
      `GenericTreeView: autoCommit firing (${dirtyPaths.size} paths)`,
      {action: 'autoCommit', component: 'GenericTreeView'},
    );
    autoCommit.onCommit(buildDirtyItems());
  }, [autoCommit, readOnly, dirtyPaths, invalidPaths, buildDirtyItems]);

  const matchSets = useMemo(
    () => (searchText ? buildMatchSets(data, searchText) : null),
    [data, searchText],
  );

  const preSearchRef = useRef<{
    expandedIds: string[];
    selectedIds: string[];
  } | null>(null);
  // Latest selectedIds/expandedIds, read inside the effect below instead of
  // via closure — the effect must not re-run when selection/expansion change
  // as a result of its own setSelectedIds/setExpandedIds calls, only when
  // searchText or matchSets change.
  const latestSelectionRef = useRef({expandedIds, selectedIds});
  latestSelectionRef.current = {expandedIds, selectedIds};

  useEffect(() => {
    if (!searchText) {
      if (preSearchRef.current) {
        setSelectedIds(preSearchRef.current.selectedIds);
        setExpandedIds(preSearchRef.current.expandedIds);
        preSearchRef.current = null;
      }
      return;
    }
    if (!preSearchRef.current) {
      const {expandedIds: prevExpandedIds, selectedIds: prevSelectedIds} =
        latestSelectionRef.current;
      preSearchRef.current = {
        expandedIds: [...prevExpandedIds],
        selectedIds: [...prevSelectedIds],
      };
    }
    if (!matchSets) {
      return;
    }
    const matchedIds = data.items
      .filter((p) => !p.isHidden && matchSets.paramIds.has(p.id))
      .map((p) => p.id);
    setSelectedIds(matchedIds);
    setExpandedIds(matchedIds);
  }, [data, searchText, matchSets]);

  const handleCollapseAll = useCallback(() => {
    if (viewMode === 'modern') {
      setExpandedIds([]);
      setModernExpandAll(false);
      onUiStateChange?.({expandedIds: []});
    } else {
      setLegacyExpandAll(false);
      setLegacyExpandedKeys(['__module__']);
      onUiStateChange?.({legacyExpandedKeys: ['__module__']});
    }
  }, [viewMode, onUiStateChange]);

  const handleExpandAll = useCallback(() => {
    if (viewMode === 'modern') {
      startExpandTransition(() => {
        setExpandedIds(selectedIds);
        setModernExpandAll(true);
        onUiStateChange?.({expandedIds: selectedIds});
      });
    } else {
      startExpandTransition(() => {
        setLegacyExpandAll(true);
        const keys = ['__module__', ...data.items.map((p) => p.id)];
        setLegacyExpandedKeys(keys);
        onUiStateChange?.({legacyExpandedKeys: keys});
      });
    }
  }, [viewMode, selectedIds, data, startExpandTransition, onUiStateChange]);

  const handleViewModeChange = useCallback(
    (mode: 'legacy' | 'modern') => {
      logger.debug(`GenericTreeView: viewMode changed (${mode})`, {
        action: 'viewMode-changed',
        component: 'GenericTreeView',
      });
      setSwitchingTo(mode);
      setPendingSwitch(true);
      startViewTransition(() => {
        if (mode === 'legacy') {
          setLegacyExpandAll(false);
          setLegacyExpandedKeys(['__module__']);
        }
        setViewMode(mode);
        setPendingSwitch(false);
        onUiStateChange?.({viewMode: mode});
      });
    },
    [startViewTransition, onUiStateChange],
  );

  const handleSelectionChange = useCallback(
    (newIds: string[], expandNew = true) => {
      setModernExpandAll(false);
      startTransition(() => {
        const nextExpanded = (() => {
          const stillSelected = expandedIds.filter((id) => newIds.includes(id));
          if (!expandNew) {
            return stillSelected;
          }
          const brandNew = newIds.filter((id) => !selectedIds.includes(id));
          return [...stillSelected, ...brandNew];
        })();
        setExpandedIds(nextExpanded);
        setSelectedIds(newIds);
        onUiStateChange?.({expandedIds: nextExpanded, selectedIds: newIds});
      });
    },
    [expandedIds, selectedIds, startTransition, onUiStateChange],
  );

  const handleExpandedChange = useCallback(
    (ids: string[]) => {
      setExpandedIds(ids);
      onUiStateChange?.({expandedIds: ids});
    },
    [onUiStateChange],
  );

  const handleLegacyExpandedChange = useCallback(
    (keys: string[]) => {
      setLegacyExpandedKeys(keys);
      onUiStateChange?.({legacyExpandedKeys: keys});
    },
    [onUiStateChange],
  );

  const selectedItems = useMemo(() => {
    const itemsById = new Map(visibleItems.map((p) => [p.id, p]));
    return selectedIds
      .map((id) => itemsById.get(id))
      .filter((item): item is TreeViewItem => item !== undefined);
  }, [selectedIds, visibleItems]);

  useImperativeHandle(
    ref,
    () => ({
      getEditedTreeViewItems: () =>
        dirtyPaths.size === 0 ? null : buildDirtyItems(),
      getTreeViewData: () => data,
      reset: () => {
        logger.debug(`GenericTreeView: reset (${data.systemId})`, {
          action: 'reset',
          component: 'GenericTreeView',
        });
        const {arrayCounts: ac, elementValues: ev} = seedFromData(data);
        setElementValues(ev);
        setArrayCounts(ac);
        setDirtyPaths(new Set());
        setSetPaths(new Set());
        setInvalidPaths(new Set());
        // Bump resetKey so uncontrolled inputs (defaultValue) remount
        // and re-read the seeded value, discarding any edited display state.
        setResetKey((k) => k + 1);
        onUiStateChange?.({
          arrayCounts: Object.fromEntries(ac),
          committedValues: Object.fromEntries(ev),
          dirtyPaths: [],
          elementValues: Object.fromEntries(ev),
          invalidPaths: [],
          setPaths: [],
        });
      },
    }),
    [dirtyPaths, data, buildDirtyItems, onUiStateChange],
  );

  const handlePolicyFilterChange = useCallback(
    (filter: Set<'BASIC' | 'ADVANCED'>) => {
      setPolicyFilter(filter);
      onUiStateChange?.({
        policyFilter: [...filter] as ('BASIC' | 'ADVANCED')[],
      });
    },
    [onUiStateChange],
  );

  const handleShowPidsChange = useCallback(
    (show: boolean) => {
      setShowPids(show);
      onUiStateChange?.({showPids: show});
    },
    [onUiStateChange],
  );

  const handleShowRangesChange = useCallback(
    (show: boolean) => {
      setShowRanges(show);
      onUiStateChange?.({showRanges: show});
    },
    [onUiStateChange],
  );

  const handleShowBadgesChange = useCallback(
    (show: boolean) => {
      setShowBadges(show);
      onUiStateChange?.({showBadges: show});
    },
    [onUiStateChange],
  );

  const handleShowModifiedOnlyChange = useCallback(
    (show: boolean) => {
      setShowModifiedOnly(show);
      onUiStateChange?.({showModifiedOnly: show});
    },
    [onUiStateChange],
  );

  const handleShowErrorsOnlyChange = useCallback(
    (show: boolean) => {
      setShowErrorsOnly(show);
      onUiStateChange?.({showErrorsOnly: show});
    },
    [onUiStateChange],
  );

  return (
    <div
      className={['relative flex h-full w-full flex-col', className]
        .filter(Boolean)
        .join(' ')}
      style={{backgroundColor: 'var(--color-surface-primary)'}}
    >
      <ViewSwitchOverlay active={isSwitchingView} switchingTo={switchingTo} />

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden transition-[filter] duration-150"
        style={
          pendingSwitch || isSwitchingView
            ? {filter: 'blur(3px) brightness(0.85)', pointerEvents: 'none'}
            : undefined
        }
      >
        {!hideToolbar && (
          <Toolbar
            dirtyPaths={dirtyPaths}
            invalidPaths={invalidPaths}
            isExpanding={isExpanding}
            onCollapseAll={handleCollapseAll}
            onExpandAll={handleExpandAll}
            onPolicyFilterChange={handlePolicyFilterChange}
            onSearchChange={handleSearchChange}
            onShowBadgesChange={handleShowBadgesChange}
            onShowErrorsOnlyChange={handleShowErrorsOnlyChange}
            onShowModifiedOnlyChange={handleShowModifiedOnlyChange}
            onShowPidsChange={handleShowPidsChange}
            onShowRangesChange={handleShowRangesChange}
            onViewModeChange={handleViewModeChange}
            policyFilter={policyFilter}
            searchText={searchInput}
            showBadges={showBadges}
            showErrorsOnly={showErrorsOnly}
            showModifiedOnly={showModifiedOnly}
            showPids={showPids}
            showRanges={showRanges}
            viewMode={viewMode}
          />
        )}

        <div
          ref={containerRef}
          className="relative flex flex-1 overflow-hidden"
        >
          {viewMode === 'modern' ? (
            <>
              <div className="h-full" style={{width: `${panelSplitPct}%`}}>
                <ParameterListPanel
                  dirtyItemIds={dirtyItemIds}
                  items={visibleItems}
                  matchSets={matchSets}
                  moduleName={title}
                  onSelectionChange={handleSelectionChange}
                  selectedIds={selectedIds}
                  setItemIds={setItemIds}
                  showPids={showPids}
                />
              </div>
              <div
                aria-orientation="vertical"
                aria-valuemax={60}
                aria-valuemin={20}
                aria-valuenow={Math.round(panelSplitPct)}
                className="relative w-[3px] shrink-0 cursor-col-resize"
                onKeyDown={handleSplitterKeyDown}
                onMouseDown={handleDragStart}
                role="separator"
                style={{backgroundColor: 'var(--color-border-brand-primary)'}}
                tabIndex={0}
              />
              <div
                className="h-full overflow-hidden"
                style={{width: `${100 - panelSplitPct}%`}}
              >
                <ParameterDetailPane
                  arrayCounts={arrayCounts}
                  committedValues={committedValues}
                  dirtyItemIds={dirtyItemIds}
                  dirtyPaths={dirtyPaths}
                  elementValues={elementValues}
                  expandAll={modernExpandAll}
                  expandedIds={expandedIds}
                  invalidPaths={invalidPaths}
                  matchSets={matchSets}
                  onAutoCommit={tryAutoCommit}
                  onExpandedChange={handleExpandedChange}
                  onValueChange={handleValueChange}
                  policyFilter={policyFilter}
                  readOnly={readOnly}
                  resetKey={resetKey}
                  searchActive={!!searchText}
                  selectedItems={selectedItems}
                  setItemIds={setItemIds}
                  setPaths={setPaths}
                  showBadges={showBadges}
                  showRanges={showRanges}
                />
              </div>
            </>
          ) : (
            <div className="h-full flex-1 overflow-hidden">
              <LegacyView
                arrayCounts={arrayCounts}
                committedValues={committedValues}
                dirtyPaths={dirtyPaths}
                elementValues={elementValues}
                expandAll={legacyExpandAll}
                expandedKeys={legacyExpandedKeys}
                invalidPaths={invalidPaths}
                items={visibleItems}
                matchSets={matchSets}
                moduleName={title}
                onAutoCommit={tryAutoCommit}
                onExpandedChange={handleLegacyExpandedChange}
                onValueChange={handleValueChange}
                policyFilter={policyFilter}
                readOnly={readOnly}
                resetKey={resetKey}
                setPaths={setPaths}
                showRanges={showRanges}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const GenericTreeView = forwardRef<
  GenericTreeViewHandle,
  GenericTreeViewProps
>(GenericTreeViewInner);
