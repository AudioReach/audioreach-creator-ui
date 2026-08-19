/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useState} from 'react';

import {ChevronDown, ChevronRight, X} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';

import type {ConfigurationItem} from '~features/key-configurator';

export interface ConfigurationSection {
  isExpanded: boolean;
  item: ConfigurationItem;
}

export interface ConfiguratorPanelProps {
  isEditable?: boolean; // Controls whether the configuration views are editable or readonly
  onEditModeChange?: (isEditable: boolean) => void; // Callback when edit mode changes
  onItemExpand?: (itemId: number, expanded: boolean) => void;
  onItemRemove?: (itemId: number) => void;
  onSelectionChange?: (items: ConfigurationItem[]) => void;
  renderConfigurationView?: (
    item: ConfigurationItem,
    isEditable: boolean,
  ) => React.ReactNode;
  selectedItems?: ConfigurationItem[];
}

// Utility functions for managing selections
export const ConfiguratorUtils = {
  /**
   * Clears all selected items (useful for usecase refresh/change)
   * @returns Empty array
   */
  clearAllSelections: (): ConfigurationItem[] => {
    return [];
  },

  /**
   * Handles item selection/unselection with support for single and multi-selection
   * @param currentItems - Currently selected items
   * @param newItem - Item to select/unselect
   * @param isMultiSelect - Whether Ctrl key is pressed for multi-selection
   * @returns Updated selection array
   */
  handleItemSelection: (
    currentItems: ConfigurationItem[],
    newItem: ConfigurationItem,
    isMultiSelect: boolean = false,
  ): ConfigurationItem[] => {
    if (isMultiSelect) {
      // Multi-selection: toggle item in selection
      const exists = currentItems.find((item) => item.id === newItem.id);
      if (exists) {
        // Remove if already selected (unselect)
        return currentItems.filter((item) => item.id !== newItem.id);
      } else {
        // Add to selection
        return [...currentItems, newItem];
      }
    } else {
      // Single selection: replace current selection
      const exists = currentItems.find((item) => item.id === newItem.id);
      if (exists && currentItems.length === 1) {
        // If clicking the same single item, unselect it
        return [];
      } else {
        // Replace with new selection
        return [newItem];
      }
    }
  },

  /**
   * Removes a specific item from selection
   * @param currentItems - Currently selected items
   * @param itemId - ID of item to remove
   * @returns Updated selection array
   */
  removeItem: (
    currentItems: ConfigurationItem[],
    itemId: number,
  ): ConfigurationItem[] => {
    return currentItems.filter((item) => item.id !== itemId);
  },
};

// Configuration Section Component
const ConfigurationSection: React.FC<{
  isEditable: boolean;
  onRemove: (id: number) => void;
  onToggleExpand: (id: number) => void;
  renderContent?: (
    item: ConfigurationItem,
    isEditable: boolean,
  ) => React.ReactNode;
  section: ConfigurationSection;
  showRemoveButton: boolean;
}> = ({
  isEditable,
  onRemove,
  onToggleExpand,
  renderContent,
  section,
  showRemoveButton,
}) => {
  const {isExpanded, item} = section;

  const handleToggleExpand = useCallback(() => {
    onToggleExpand(section.item.id);
  }, [section.item.id, onToggleExpand]);

  const handleRemove = useCallback(() => {
    onRemove(section.item.id);
  }, [section.item.id, onRemove]);

  const defaultContent = (
    <div className="text-neutral-secondary p-4 text-sm">
      Configuration view for {item.type}: {item.name}
      <div className="text-neutral-secondary mt-2 text-xs">
        No custom renderer provided for this item type.
      </div>
    </div>
  );

  return (
    <div className="border-neutral-02 overflow-hidden rounded-lg border">
      {/* Header */}
      <div
        className="bg-secondary border-neutral-02 flex items-center justify-between border-b px-4 py-3"
      >
        <div className="flex items-center space-x-2">
          <IconButton
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            icon={
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            }
            onClick={handleToggleExpand}
            variant="ghost"
          />
          <div className="flex items-center space-x-2">
            {/* <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
              {item.type.toUpperCase()}:
            </span> */}
            <h3 className="text-m text-neutral-primary">
              {item.type}: {item.name}
            </h3>
          </div>
        </div>

        {showRemoveButton && (
          <IconButton
            aria-label="Remove section"
            emphasis="danger"
            icon={<X className="h-4 w-4" />}
            onClick={handleRemove}
            variant="ghost"
          />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="bg-primary">
          {renderContent ? renderContent(item, isEditable) : defaultContent}
        </div>
      )}
    </div>
  );
};

// Main ConfiguratorPanel Component
export const ConfiguratorPanel: React.FC<ConfiguratorPanelProps> = ({
  isEditable = false,
  onItemExpand,
  onItemRemove,
  onSelectionChange,
  renderConfigurationView,
  selectedItems = [],
}) => {
  const [sections, setSections] = useState<ConfigurationSection[]>([]);

  // Update sections when selectedItems changes
  useEffect(() => {
    const newSections: ConfigurationSection[] = selectedItems.map((item) => ({
      isExpanded: true, // Default to expanded
      item,
    }));
    setSections(newSections);
  }, [selectedItems]);

  const handleToggleExpand = useCallback(
    (sectionId: number) => {
      setSections((prevSections) =>
        prevSections.map((section) =>
          section.item.id === sectionId
            ? {...section, isExpanded: !section.isExpanded}
            : section,
        ),
      );

      const section = sections.find((s) => s.item.id === sectionId);
      if (section && onItemExpand) {
        onItemExpand(sectionId, !section.isExpanded);
      }
    },
    [sections, onItemExpand],
  );

  const handleRemoveSection = useCallback(
    (sectionId: number) => {
      const updatedItems = selectedItems.filter(
        (item) => item.id !== sectionId,
      );

      if (onSelectionChange) {
        onSelectionChange(updatedItems);
      }

      if (onItemRemove) {
        onItemRemove(sectionId);
      }
    },
    [selectedItems, onSelectionChange, onItemRemove],
  );

  if (sections.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-secondary text-sm">
          Select a module or subgraph or subsystem to configure.
        </p>
        <p className="text-neutral-secondary mt-2 text-xs">
          Hold Ctrl and click multiple items to configure them simultaneously.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {sections.map((section) => (
        <ConfigurationSection
          key={section.item.id}
          isEditable={isEditable}
          onRemove={handleRemoveSection}
          onToggleExpand={handleToggleExpand}
          renderContent={renderConfigurationView}
          section={section}
          showRemoveButton
        />
      ))}
    </div>
  );
};
