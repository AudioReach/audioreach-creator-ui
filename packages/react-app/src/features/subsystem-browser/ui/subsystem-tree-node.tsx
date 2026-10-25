/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {FC, KeyboardEvent} from 'react';

import {ChevronDown, ChevronRight, Dot} from 'lucide-react';

import type {SubsystemBrowserTreeNode} from '~shared/store/tab-store-slices/subsystem-slice';
import {ConvertStringToNumber} from '~shared/utils/converter-utils';

interface SubsystemTreeNodeProps {
  currentSystemId?: string;
  isExpanded: (id: number) => boolean;
  onClick: (systemId: string) => void;
  pickerMode?: boolean;
  rootNode?: boolean;
  searchTerm: string;
  selectedSystemId: string;
  toggleNode: (id: number) => void;
  treeNode: SubsystemBrowserTreeNode;
}

const SubsystemTreeNode: FC<SubsystemTreeNodeProps> = ({
  currentSystemId,
  isExpanded,
  onClick,
  pickerMode = false,
  rootNode = false,
  searchTerm,
  selectedSystemId,
  toggleNode,
  treeNode,
}) => {
  const hasChildren = !!(treeNode.children && treeNode.children.length > 0);
  const expanded = isExpanded(treeNode.id);

  const searchMatches = (
    node: SubsystemBrowserTreeNode,
    searchTerm: string,
  ) => {
    const termToLower = searchTerm.trim().toLowerCase();
    if (!termToLower) {
      // empty string, treat all nodes as matches
      return true;
    }

    if (node.name.toLowerCase().includes(termToLower)) {
      return true;
    }

    // convert a search term that may be decimal or hex ("0xFF" or "ff") into a
    // number
    const idNumber = ConvertStringToNumber(termToLower);
    return idNumber !== null && idNumber === node.id;
  };

  // A treeNode is visible if it matches the search Input or has any matching
  // descendants.
  const hasMatchInSubtree = (
    treeNode: SubsystemBrowserTreeNode,
    searchInput: string,
  ): boolean => {
    if (searchMatches(treeNode, searchInput)) {
      return true;
    }
    return !!treeNode.children?.some((childNode) =>
      hasMatchInSubtree(childNode, searchInput),
    );
  };

  // It decides the subsystem node visibility
  const isVisible = hasMatchInSubtree(treeNode, searchTerm);
  const isSelected = treeNode.systemId === selectedSystemId;
  const isCurrent =
    pickerMode &&
    treeNode.systemId === currentSystemId;

  let rowClassName: string | undefined;
  if (pickerMode) {
    const stateClassName = isSelected
      ? 'bg-brand-primary text-white'
      : isCurrent
        ? 'bg-neutral-02 text-neutral-primary hover:bg-neutral-03'
        : 'text-neutral-primary hover:bg-neutral-02';
    rowClassName = `rounded px-2 py-0.5 transition-colors ${stateClassName}`;
  } else if (isSelected) {
    rowClassName = 'bg-neutral-02 text-neutral-primary rounded';
  }

  const handleNavigationKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(treeNode.systemId);
    }
  };

  return (
    <div style={{cursor: 'pointer', marginLeft: rootNode ? 0 : '1rem'}}>
      {isVisible && (
        <div
          style={{
            alignItems: 'center', // center the button vertically with the text
            display: 'flex',
            gap: 2,
            marginBottom: 5,
          }}
        >
          {hasChildren ? (
            <button onClick={() => toggleNode(treeNode.id)}>
              {expanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          ) : (
            <span>
              <Dot />
            </span>
          )}

          <span
            aria-current={isSelected ? 'page' : undefined}
            aria-label={`Navigate to ${treeNode.name}`}
            className={rowClassName}
            onClick={() => onClick(treeNode.systemId)}
            onKeyDown={handleNavigationKeyDown}
            role="button"
            style={{fontWeight: 'bold'}}
            tabIndex={0}
            title={`ID: ${treeNode.id}`}
          >
            {treeNode.name}
          </span>
        </div>
      )}
      {expanded &&
        hasChildren &&
        treeNode.children.map((childNode) => (
          <SubsystemTreeNode
            key={childNode.id}
            currentSystemId={currentSystemId}
            isExpanded={isExpanded}
            onClick={onClick}
            pickerMode={pickerMode}
            searchTerm={searchTerm}
            selectedSystemId={selectedSystemId}
            toggleNode={toggleNode}
            treeNode={childNode}
          />
        ))}
    </div>
  );
};

export default SubsystemTreeNode;
