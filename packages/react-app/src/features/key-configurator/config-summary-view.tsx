/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo, useState} from 'react';

import {ChevronDown, ChevronRight, Edit, Plus, Trash2} from 'lucide-react';

import {Button, IconButton} from '@qualcomm-ui/react/button';

import ArcSearchBar from '~shared/controls/arc-search-bar';
import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

interface ConfigSummaryItem {
  id: number;
  keyValuePairs?: Array<{
    key: {id: number; name: string};
    value: {id: number; name: string};
  }>;
  label: string;
}

interface ConfigSummaryViewProps {
  isEditable: boolean;
  items: ConfigSummaryItem[];
  onAddClick?: () => void;
  onDeleteItem?: (id: number) => void;
  onEditItem?: (id: number) => void;
  showEditIcon?: boolean;
  title: string;
}

export function ConfigSummaryView({
  isEditable,
  items,
  onAddClick,
  onDeleteItem,
  onEditItem,
  showEditIcon = false,
  title,
}: ConfigSummaryViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return items;
    }

    const searchLower = searchTerm.toLowerCase();
    const searchAsNumber = ConvertStringToNumber(searchTerm);

    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchLower) ||
        (searchAsNumber !== null && item.id === searchAsNumber),
    );
  }, [items, searchTerm]);

  const handleDeleteClick = (id: number) => {
    // TODO: Notify and confirm from user
    onDeleteItem?.(id);
  };

  const handleDeleteFiltered = () => {
    // TODO: Notify and confirm from user
    // Collect all IDs first to avoid issues with state updates during iteration
    // Sort in descending order to delete from highest index to lowest
    // This prevents index shifting issues when IDs are array indices
    const idsToDelete = filteredItems
      .map((item) => item.id)
      .sort((a, b) => b - a);
    idsToDelete.forEach((id) => {
      onDeleteItem?.(id);
    });
  };

  const handleAddClick = () => {
    setSearchTerm('');
    onAddClick?.();
  };

  return (
    <div
      className="overflow-hidden rounded-md border shadow-sm"
      style={{
        backgroundColor: 'var(--color-surface-primary)',
        borderColor: 'var(--color-border-neutral-02)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 border-b px-1 py-1"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          borderColor: 'var(--color-border-neutral-02)',
        }}
      >
        <div className="flex items-center gap-2">
          <IconButton
            aria-label={`Toggle ${title} section`}
            icon={
              isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            }
            onClick={toggleCollapse}
            variant="ghost"
          />
          <h2
            className="text-base font-semibold"
            style={{color: 'var(--color-text-neutral-primary)'}}
          >
            {title}
          </h2>
        </div>

        {/* Search Bar - Only visible when there are items */}
        {items.length > 0 && (
          <div className="m-0.5 flex-1">
            <ArcSearchBar
              onSearchChange={setSearchTerm}
              placeholder="Search configured keys..."
              searchTerm={searchTerm}
            />
          </div>
        )}

        {/* Delete Filtered Button - Only visible when there are filtered results */}
        {searchTerm &&
          filteredItems.length > 0 &&
          onDeleteItem &&
          isEditable && (
            <Button
              className="flex items-center gap-1.5"
              emphasis="danger"
              onClick={handleDeleteFiltered}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--color-surface-error-subtle)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
              }}
              startIcon={Trash2}
              title={`Delete ${filteredItems.length} filtered key(s)`}
              variant="ghost"
            >
              Delete ({filteredItems.length})
            </Button>
          )}

        {onAddClick && isEditable && (
          <Button
            className="mr-2 inline-flex items-center"
            emphasis="primary"
            onClick={handleAddClick}
            startIcon={Plus}
            title="Add configuration"
            variant="fill"
          >
            Add
          </Button>
        )}
      </div>

      {/* Content */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[60vh] overflow-auto'
        }`}
      >
        <div className="p-4">
          {items.length === 0 ? (
            <div
              className="text-center"
              style={{color: 'var(--color-text-neutral-tertiary)'}}
            >
              <p>No keys configured</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="text-center"
              style={{color: 'var(--color-text-neutral-tertiary)'}}
            >
              <div className="mb-2 text-2xl">🔍</div>
              <p>No keys match your search</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  {/* Edit Icon - Hidden by default */}
                  {showEditIcon && onEditItem && isEditable && (
                    <IconButton
                      aria-label="Edit"
                      icon={<Edit className="h-3.5 w-3.5" />}
                      onClick={() => onEditItem(item.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          'var(--color-border-info)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--color-background-support-info)',
                      }}
                      title="Edit item"
                      variant="ghost"
                    />
                  )}

                  {/* Delete Icon */}
                  {onDeleteItem && isEditable && (
                    <IconButton
                      aria-label="Delete"
                      icon={
                        <Trash2
                          className="h-3.5 w-3.5"
                          style={{color: 'red'}}
                        />
                      }
                      onClick={() =>
                        handleDeleteClick(item.id /* , item.label, e */)
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'red';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-info)',
                      }}
                      title="Delete item"
                      variant="ghost"
                    />
                  )}

                  {/* Item Label */}
                  <span
                    className="inline-block cursor-default rounded-full px-3 py-1 text-sm font-medium"
                    style={{color: 'var(--color-text-neutral-primary)'}}
                    title={
                      item.keyValuePairs && item.keyValuePairs.length > 0
                        ? item.keyValuePairs
                            .map(
                              (pair) =>
                                `[${ConvertNumberToHexString(pair.key.id)}: ${ConvertNumberToHexString(pair.value.id)}]`,
                            )
                            .join(' ')
                        : `${ConvertNumberToHexString(item.id)}`
                    }
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
