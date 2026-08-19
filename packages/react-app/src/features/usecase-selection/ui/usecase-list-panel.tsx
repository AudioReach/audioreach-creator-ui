/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {memo, useEffect, useMemo, useState} from 'react';

import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Loader2,
  SearchX,
  Settings,
  Trash2,
} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';
import {Checkbox} from '@qualcomm-ui/react/checkbox';
import {Dialog} from '@qualcomm-ui/react/dialog';
import {Menu} from '@qualcomm-ui/react/menu';
import {Tooltip} from '@qualcomm-ui/react/tooltip';
import {Portal} from '@qualcomm-ui/react-core/portal';

import {
  formatAsKeysValues,
  formatAsKeysValuesWithIds,
  formatAsSearchKey,
  getLeafItems,
  type UsecaseCategory,
  type UsecaseItem,
} from '~entities/usecases';
import {logger} from '~shared/lib/logger';

const copyToClipboard = (text: string): void => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      logger.info(`Copied ${text} to clipboard`, {
        action: 'copy_to_clipboard',
        component: 'UsecaseListPanel',
      });
    })
    .catch((error: unknown) => {
      logger.error('Failed to copy to clipboard', {
        action: 'copy_to_clipboard',
        component: 'UsecaseListPanel',
        error: error instanceof Error ? error.message : String(error),
      });
    });
};

/** Derives checkbox `checked`/`indeterminate` state from a matched/total count. */
const getCheckboxState = (
  matched: number,
  total: number,
): {checked: boolean; indeterminate: boolean} => ({
  checked: matched === total && total > 0,
  indeterminate: matched > 0 && matched < total,
});

// ── UsecaseItemRow ────────────────────────────────────────────────────────────
// Renders a single item in the usecase tree — either a group header (with
// children) or a leaf usecase row. Wrapped with React.memo so only the row
// whose props changed re-renders when the selection or expansion state updates.

interface UsecaseItemRowProps {
  expandedItems: Set<string>;
  handleSelectCategory: (itemNames: string[], isSelected: boolean) => void;
  handleSelectUsecase: (itemName: string, isSelected: boolean) => void;
  item: UsecaseItem;
  selectedUsecasesSet: Set<string>;
  setContextMenuItem: React.Dispatch<
    React.SetStateAction<{item: UsecaseItem; x: number; y: number} | null>
  >;
  setExpandedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  setHoveredItem: React.Dispatch<
    React.SetStateAction<{anchorRect: DOMRect; item: UsecaseItem} | null>
  >;
}

const UsecaseItemRow = memo<UsecaseItemRowProps>(
  ({
    expandedItems,
    handleSelectCategory,
    handleSelectUsecase,
    item,
    selectedUsecasesSet,
    setContextMenuItem,
    setExpandedItems,
    setHoveredItem,
  }) => {
    const hasChildren = (item.children?.length ?? 0) > 0;

    if (hasChildren) {
      const isExpanded = expandedItems.has(item.name);
      const leafDescendants = getLeafItems([item]);
      const checkedCount = leafDescendants.filter((i) =>
        selectedUsecasesSet.has(i.name),
      ).length;
      const checkboxState = getCheckboxState(
        checkedCount,
        leafDescendants.length,
      );

      return (
        /* systemId is present for leaf usecases; group headers like subsystem filtered, use name as fallback key */
        <div>
          <div className="mb-1 flex items-center">
            <IconButton
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
              emphasis="neutral"
              icon={isExpanded ? ChevronDown : ChevronRight}
              onClick={() => {
                setExpandedItems((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.name)) {
                    next.delete(item.name);
                  } else {
                    next.add(item.name);
                  }
                  return next;
                });
              }}
              size="sm"
              variant="ghost"
            />
            <label className="text-neutral-secondary flex cursor-pointer items-center text-sm font-medium">
              <Checkbox
                aria-label={`Select all in ${item.name}`}
                checked={checkboxState.checked}
                indeterminate={checkboxState.indeterminate}
                onCheckedChange={(checked) => {
                  const names = leafDescendants.map((i) => i.name);
                  handleSelectCategory(names, checked === true);
                }}
                size="sm"
              />
              <span className="ml-2">{item.name}</span>
            </label>
          </div>
          {isExpanded && (
            <div
              className="border-neutral-02 ml-8 border-l pl-2"
            >
              {item.children!.map((child) => (
                <UsecaseItemRow
                  key={child.systemId ?? child.name}
                  expandedItems={expandedItems}
                  handleSelectCategory={handleSelectCategory}
                  handleSelectUsecase={handleSelectUsecase}
                  item={child}
                  selectedUsecasesSet={selectedUsecasesSet}
                  setContextMenuItem={setContextMenuItem}
                  setExpandedItems={setExpandedItems}
                  setHoveredItem={setHoveredItem}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Leaf item ──────────────────────────────────────────────────────────────
    // Leaf usecases always have a systemId from the API.
    // The fallback to item.name is a safety net (should never be needed here).
    return (
      <div
        className="mb-2 last:mb-0"
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuItem({item, x: e.clientX, y: e.clientY});
        }}
        onMouseEnter={(e) => {
          setHoveredItem({
            anchorRect: (
              e.currentTarget as HTMLElement
            ).getBoundingClientRect(),
            item,
          });
        }}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <label className="text-neutral-primary flex cursor-pointer items-center text-sm">
          <Checkbox
            aria-label={`Select ${item.name}`}
            checked={selectedUsecasesSet.has(item.name)}
            onCheckedChange={(checked) =>
              handleSelectUsecase(item.name, checked === true)
            }
            size="sm"
          />
          <span className="ml-2">{item.name}</span>
        </label>
      </div>
    );
  },
);

UsecaseItemRow.displayName = 'UsecaseItemRow';

// ── UsecaseListPanel ──────────────────────────────────────────────────────────

interface UsecaseListPanelProps {
  /** When false, the delete button is hidden regardless of selection. Defaults to true. */
  allowDelete?: boolean;
  expandedCategories: string[];
  handleSelectAll: (isSelected: boolean) => void;
  handleSelectCategory: (itemNames: string[], isSelected: boolean) => void;
  handleSelectUsecase: (itemName: string, isSelected: boolean) => void;
  /**
   * When true, a loading spinner is shown instead of the usecase list.
   * Set while a backend search request is in flight.
   */
  isSearching?: boolean;
  onClose: () => void;
  onCollapseAll: () => void;
  onDeleteSelected: () => void;
  onExpandAll: () => void;
  selectedUsecases: string[];
  toggleCategoryExpansion: (categoryName: string) => void;
  usecaseData: UsecaseCategory[];
}

export const UsecaseListPanel: React.FC<UsecaseListPanelProps> = ({
  allowDelete = true,
  expandedCategories,
  handleSelectAll,
  handleSelectCategory,
  handleSelectUsecase,
  isSearching = false,
  onClose,
  onCollapseAll,
  onDeleteSelected,
  onExpandAll,
  selectedUsecases,
  toggleCategoryExpansion,
  usecaseData,
}) => {
  const [contextMenuItem, setContextMenuItem] = useState<{
    item: UsecaseItem;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredItem, setHoveredItem] = useState<{
    anchorRect: DOMRect;
    item: UsecaseItem;
  } | null>(null);

  // Seeded from item.expanded on first render.
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const seed = (items: UsecaseItem[]) => {
      items.forEach((item) => {
        if (item.expanded && item.children?.length) {
          initial.add(item.name);
        }
        if (item.children?.length) {
          seed(item.children);
        }
      });
    };
    usecaseData.forEach((cat) => seed(cat.items));
    return initial;
  });

  // When usecaseData changes (e.g. search or workflow switch), merge
  // any newly-arriving group items that have expanded: true into expandedItems.
  // The mount-time seed only runs once, so new groups would otherwise render
  // collapsed until the dropdown is closed and reopened.
  useEffect(() => {
    const newlyExpanded: string[] = [];
    const collect = (items: UsecaseItem[]) => {
      items.forEach((item) => {
        if (item.expanded && item.children?.length) {
          newlyExpanded.push(item.name);
        }
        if (item.children?.length) {
          collect(item.children);
        }
      });
    };
    usecaseData.forEach((cat) => collect(cat.items));

    if (newlyExpanded.length > 0) {
      setExpandedItems((prev) => {
        const hasNew = newlyExpanded.some((name) => !prev.has(name));
        if (!hasNew) {
          return prev;
        } // avoid unnecessary re-render
        const next = new Set(prev);
        newlyExpanded.forEach((name) => next.add(name));
        return next;
      });
    }
  }, [usecaseData]);

  const selectedUsecasesSet = useMemo(
    () => new Set(selectedUsecases),
    [selectedUsecases],
  );

  const selectAllState = useMemo(() => {
    const uniqueVisibleLeafNames = [
      ...new Set(
        usecaseData.flatMap((cat) =>
          getLeafItems(cat.items).map((item) => item.name),
        ),
      ),
    ];
    const checkedVisibleCount = uniqueVisibleLeafNames.filter((name) =>
      selectedUsecasesSet.has(name),
    ).length;
    return getCheckboxState(checkedVisibleCount, uniqueVisibleLeafNames.length);
  }, [usecaseData, selectedUsecasesSet]);

  return (
    <div className="flex w-full flex-col">
      {/* Top controls - Sticky header */}
      <div
        className="border-neutral-02 flex-shrink-0 border-b px-3 py-2"
      >
        <div className="flex items-center justify-between">
          <label className="text-neutral-primary flex cursor-pointer items-center text-sm">
            <Checkbox
              aria-label="Select all usecases"
              checked={selectAllState.checked}
              indeterminate={selectAllState.indeterminate}
              onCheckedChange={(checked) => handleSelectAll(checked === true)}
              size="sm"
            />
            <span className="ml-2">Select All</span>
          </label>
          <div className="flex items-center space-x-1">
            <IconButton
              aria-label="Expand All"
              emphasis="neutral"
              icon={ChevronsDown}
              onClick={onExpandAll}
              size="md"
              title="Expand All"
              variant="ghost"
            />
            <IconButton
              aria-label="Collapse All"
              emphasis="neutral"
              icon={ChevronsUp}
              onClick={onCollapseAll}
              size="md"
              title="Collapse All"
              variant="ghost"
            />
            {allowDelete && selectedUsecases.length > 0 && (
              <Dialog.Root emphasis="danger" preventScroll={false}>
                <Dialog.Trigger>
                  <IconButton
                    aria-label="Delete"
                    emphasis="danger"
                    icon={Trash2}
                    size="md"
                    title="Delete"
                    variant="ghost"
                  />
                </Dialog.Trigger>
                <Dialog.FloatingPortal>
                  <Dialog.Body>
                    <Dialog.IndicatorIcon />
                    <Dialog.Heading>Delete Usecases</Dialog.Heading>
                    <Dialog.CloseButton />
                    <Dialog.Description>
                      {`Are you sure you want to delete ${selectedUsecases.length} selected usecase${selectedUsecases.length > 1 ? 's' : ''}? This action cannot be undone.`}
                    </Dialog.Description>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.CloseTrigger>
                      <Button emphasis="neutral" size="sm" variant="outline">
                        Cancel
                      </Button>
                    </Dialog.CloseTrigger>
                    <Dialog.CloseTrigger>
                      <Button
                        emphasis="danger"
                        onClick={onDeleteSelected}
                        size="sm"
                        variant="fill"
                      >
                        Delete
                      </Button>
                    </Dialog.CloseTrigger>
                  </Dialog.Footer>
                </Dialog.FloatingPortal>
              </Dialog.Root>
            )}
            <IconButton
              aria-label="Settings"
              emphasis="neutral"
              icon={Settings}
              size="md"
              title="Settings"
              variant="ghost"
            />
            <Button onClick={onClose} size="sm" variant="outline">
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Usecase Categories - Scrollable content */}
      <div className="flex-grow overflow-y-auto px-3 py-2">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2
              className="text-neutral-secondary mb-3 animate-spin opacity-60"
              size={28}
            />
            <p className="text-neutral-secondary text-sm">Searching...</p>
          </div>
        ) : usecaseData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <SearchX
              className="text-neutral-secondary mb-3 opacity-40"
              size={32}
            />
            <p className="text-neutral-primary text-sm font-medium">
              No usecases match
            </p>
          </div>
        ) : (
          usecaseData.map((category) => {
            const isCategoryExpanded = expandedCategories.includes(
              category.name,
            );

            // Leaf items for category-level checkbox state
            const categoryLeafItems = getLeafItems(category.items);
            const checkedInCategory = categoryLeafItems.filter((item) =>
              selectedUsecasesSet.has(item.name),
            ).length;
            const categoryCheckboxState = getCheckboxState(
              checkedInCategory,
              categoryLeafItems.length,
            );
            const icon = isCategoryExpanded ? ChevronDown : ChevronRight;

            return (
              <div key={category.name} className="mb-3 last:mb-0">
                {/* Category header */}
                <div className="mb-1 flex items-center">
                  <IconButton
                    aria-label={`${isCategoryExpanded ? 'Collapse' : 'Expand'} ${category.name}`}
                    emphasis="neutral"
                    icon={icon}
                    onClick={() => toggleCategoryExpansion(category.name)}
                    size="sm"
                    variant="ghost"
                  />
                  <label className="text-neutral-primary flex cursor-pointer items-center text-sm font-semibold">
                    <Checkbox
                      aria-label={`Select all usecases in ${category.name}`}
                      checked={categoryCheckboxState.checked}
                      indeterminate={categoryCheckboxState.indeterminate}
                      onCheckedChange={(checked) => {
                        const names = categoryLeafItems.map(
                          (item) => item.name,
                        );
                        handleSelectCategory(names, checked === true);
                      }}
                      size="sm"
                    />
                    <span className="ml-2">{category.name}</span>
                  </label>
                </div>

                {/* Category items — rendered recursively */}
                {isCategoryExpanded && (
                  <div
                    className="border-neutral-02 ml-10 border-l pl-3"
                  >
                    {category.items.map((item) => (
                      <UsecaseItemRow
                        key={item.systemId ?? item.name}
                        expandedItems={expandedItems}
                        handleSelectCategory={handleSelectCategory}
                        handleSelectUsecase={handleSelectUsecase}
                        item={item}
                        selectedUsecasesSet={selectedUsecasesSet}
                        setContextMenuItem={setContextMenuItem}
                        setExpandedItems={setExpandedItems}
                        setHoveredItem={setHoveredItem}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Single tooltip — shown on leaf item hover */}
      {hoveredItem && (
        <Tooltip
          hideArrow
          open
          positioning={{
            getAnchorRect: () => hoveredItem.anchorRect,
            placement: 'bottom-start',
          }}
          trigger={<span style={{display: 'none'}} />}
        >
          {formatAsKeysValues(hoveredItem.item)}
        </Tooltip>
      )}

      {/* Single context menu — shared across all item rows */}
      {contextMenuItem && (
        <Portal>
          <Menu.Root
            onOpenChange={(open) => {
              if (!open) {
                setContextMenuItem(null);
              }
            }}
            open
            positioning={{
              getAnchorRect: () => ({
                x: contextMenuItem.x,
                y: contextMenuItem.y,
              }),
              gutter: 0,
              placement: 'bottom-start',
            }}
          >
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item
                  onClick={() => {
                    copyToClipboard(formatAsSearchKey(contextMenuItem.item));
                    setContextMenuItem(null);
                  }}
                  value="copy-search-key"
                >
                  Copy as Search Key
                </Menu.Item>
                <Menu.Item
                  onClick={() => {
                    copyToClipboard(formatAsKeysValues(contextMenuItem.item));
                    setContextMenuItem(null);
                  }}
                  value="copy-keys-values"
                >
                  Copy as Usecase Keys/Values
                </Menu.Item>
                <Menu.Item
                  onClick={() => {
                    copyToClipboard(
                      formatAsKeysValuesWithIds(contextMenuItem.item),
                    );
                    setContextMenuItem(null);
                  }}
                  value="copy-keys-values-ids"
                >
                  Copy as Usecase Keys/Values and IDs
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </Portal>
      )}
    </div>
  );
};
