/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';

import {ChevronDown, ChevronRight, Tag, Trash2} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';

import {ConvertNumberToHexString} from '~shared/utils/converter-utils';

import type {ConfiguredTkv} from './module-tag-keys-config.types';

interface TagGroupSummaryProps {
  configurations: ConfiguredTkv[];
  hasActiveSearch?: boolean;
  isEditable: boolean;
  onDeleteItem: (id: string) => void;
  onDeleteTagGroup: (tagGroupName: string) => void;
  onEditItem: (id: string) => void;
  tagGroupName: string;
}

export function TagGroupSummary({
  configurations,
  hasActiveSearch = false,
  isEditable,
  onDeleteItem,
  onDeleteTagGroup,
  onEditItem,
  tagGroupName,
}: TagGroupSummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Auto-expand when there's an active search
  useEffect(() => {
    if (hasActiveSearch) {
      setIsCollapsed(false);
    }
  }, [hasActiveSearch]);

  const handleDeleteTagGroup = () => {
    // TODO: Notify and confirm from user
    onDeleteTagGroup(tagGroupName);
  };

  // Generate unique ID from TKV's own IDs (tagGroupId + keyIds + valueIds)
  const generateTKVId = (config: ConfiguredTkv): string => {
    return `${config.tagGroupId}_${config.keyValuePairs
      .map((p) => `${p.key.id}_${p.value.id}`)
      .sort()
      .join('_')}`;
  };

  // Convert configurations to display format using ID-based identification
  const items = configurations.map((config) => ({
    id: generateTKVId(config),
    keyValuePairs: config.keyValuePairs,
    label:
      config.keyValuePairs.length === 0
        ? `[${tagGroupName}]`
        : config.keyValuePairs
            .map((p) => `[${p.key.name}: ${p.value.name}]`)
            .join(' '),
    tagGroupId: config.tagGroupId,
  }));

  return (
    <div
      className="pt-0.5"
      style={{borderColor: 'var(--color-border-neutral-02)'}}
    >
      <div
        className="flex cursor-pointer items-center justify-between rounded px-4 py-1.5 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
        }}
      >
        <div className="flex flex-1 items-center">
          <IconButton
            aria-label={`Toggle ${tagGroupName} section`}
            icon={
              isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )
            }
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            variant="ghost"
          />
          <Tag
            className="mr-2 h-3.5 w-3.5"
            style={{color: 'var(--color-text-success)'}}
          />
          <span
            className="text-[15px] font-semibold"
            style={{color: 'var(--color-text-success)'}}
            title={
              configurations.length > 0
                ? `Tag Id: ${ConvertNumberToHexString(configurations[0].tagGroupId)}`
                : ''
            }
          >
            {tagGroupName}
          </span>
        </div>
        {isEditable && (
          <IconButton
            aria-label="Delete tag group"
            icon={<Trash2 className="h-3.5 w-3.5" style={{color: 'red'}} />}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTagGroup();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'red';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
            }}
            style={{backgroundColor: 'transparent'}}
            title={`Delete all configurations in ${tagGroupName}`}
            variant="ghost"
          />
        )}
      </div>

      {/* Nested configurations */}
      {!isCollapsed && (
        <div className="mt-1 pl-8">
          {items.length === 0 ? (
            <div
              className="py-2 text-center"
              style={{color: 'var(--color-text-neutral-tertiary)'}}
            >
              <p className="text-sm">No configurations in this tag group</p>
            </div>
          ) : (
            <ul className="space-y-2 py-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  {/* Edit Icon */}
                  {isEditable && (
                    <IconButton
                      aria-label="Edit"
                      icon={
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                          />
                        </svg>
                      }
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
                  {isEditable && (
                    <IconButton
                      aria-label="Delete"
                      icon={
                        <Trash2
                          className="h-3.5 w-3.5"
                          style={{color: 'red'}}
                        />
                      }
                      onClick={() => {
                        // TODO: Notify and confirm from user
                        onDeleteItem(item.id);
                      }}
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
                    className="inline-block rounded-full px-3 py-1 text-sm font-medium"
                    style={{color: 'var(--color-text-success)'}}
                    title={
                      item.keyValuePairs && item.keyValuePairs.length > 0
                        ? item.keyValuePairs
                            .map(
                              (pair) =>
                                `[${ConvertNumberToHexString(pair.key.id)}: ${ConvertNumberToHexString(pair.value.id)}]`,
                            )
                            .join(' ')
                        : undefined
                    }
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
