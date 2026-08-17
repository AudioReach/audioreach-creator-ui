/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo, useState} from 'react';

import type {PopoverTriggerBindings} from '@qualcomm-ui/core/popover';
import {
  createTreeCollection,
  type TreeLeafNodeBindings,
} from '@qualcomm-ui/core/tree';
import {Popover} from '@qualcomm-ui/react/popover';
import {SideNav} from '@qualcomm-ui/react/side-nav';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import type {SideNavItem} from '~shared/types/side-nav-types';

import {useSideNavContext} from './side-nav-provider';

type ButtonRenderProps = React.ComponentPropsWithRef<'button'> & {
  className?: string;
  style?: React.CSSProperties;
};

function PopoverLeafItem({
  isNavExpanded,
  node,
}: {
  isNavExpanded: boolean;
  node: SideNavItem;
}) {
  const triggerLeaf = (
    triggerProps: PopoverTriggerBindings & {className?: string},
  ) => (
    <SideNav.LeafNode
      render={(leafProps) => {
        const sideNavProps = leafProps as TreeLeafNodeBindings & {
          className?: string;
        };
        const buttonProps: ButtonRenderProps = {
          ...sideNavProps,
          ...triggerProps,
          className: [sideNavProps.className, triggerProps.className]
            .filter(Boolean)
            .join(' '),
          onClick: (event) => {
            triggerProps.onClick(event);
            sideNavProps.onClick(event);
          },
          onFocus: sideNavProps.onFocus,
          onPointerDown: triggerProps.onPointerDown,
          style: sideNavProps.style,
          type: 'button',
        };

        return <button {...buttonProps} />;
      }}
    >
      <SideNav.NodeIndicator />
      {node.icon ? <SideNav.NodeIcon icon={node.icon} /> : null}
      {isNavExpanded ? (
        <SideNav.NodeText>{node.label}</SideNav.NodeText>
      ) : null}
    </SideNav.LeafNode>
  );

  return (
    <Popover.Root
      lazyMount
      positioning={{placement: 'right'}}
      unmountOnExit
    >
      <Popover.Anchor>
        {isNavExpanded ? (
          <Popover.Trigger>{triggerLeaf}</Popover.Trigger>
        ) : (
          <Tooltip
            positioning={{placement: 'right'}}
            trigger={
              <span>
                <Popover.Trigger>{triggerLeaf}</Popover.Trigger>
              </span>
            }
          >
            {node.tooltip ?? node.label}
          </Tooltip>
        )}
      </Popover.Anchor>
      <Popover.Positioner>
        <Popover.Content>
          <Popover.Arrow />
          {node.popoverContent}
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}

export function ArcSideNav() {
  const [open, setOpen] = useState(false);
  const [wasAutoExpanded, setWasAutoExpanded] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<string[]>([]);
  const {items, onItemSelect} = useSideNavContext();

  // Dynamically discover groups in order of appearance
  // Ungrouped items appear last (at the bottom)
  const groupOrder = useMemo(() => {
    const groups: string[] = [];
    const seen = new Set<string>();

    items.forEach((item) => {
      if (item.group && !seen.has(item.group)) {
        groups.push(item.group);
        seen.add(item.group);
      }
    });

    // Add ungrouped at the end so default items appear at bottom
    groups.push('ungrouped');

    return groups;
  }, [items]);

  // Create tree collection from items
  const collection = createTreeCollection<SideNavItem>({
    nodeChildren: 'children',
    nodeText: (node) => node.label,
    nodeValue: (node) => node.id,
    rootNode: {
      children: items,
      id: 'root',
      label: '',
    },
  });

  // Split items into top (widget) and bottom (default) sections at the item level.
  // Default items are identified by the '__default_' id prefix set in side-nav-provider.
  // Filtering per-item (not per-group) handles mixed groups where widget items and
  // default items share the same 'ungrouped' bucket.
  const allGroups = useMemo(() => {
    return items.length > 0
      ? collection.groupChildren(
          [],
          (node) => node.group ?? 'ungrouped',
          groupOrder,
        )
      : [];
  }, [items, collection, groupOrder]);

  const topGroupsData = useMemo(() => {
    return allGroups
      .map((group) => ({
        items: group.items.filter(
          ({node}) => !node.id.startsWith('__default_'),
        ),
        key: group.key,
      }))
      .filter((group) => group.items.length > 0);
  }, [allGroups]);

  const bottomGroupData = useMemo(() => {
    const bottomItems = allGroups.flatMap((group) =>
      group.items.filter(({node}) => node.id.startsWith('__default_')),
    );
    return bottomItems.length > 0
      ? [{items: bottomItems, key: 'ungrouped'}]
      : [];
  }, [allGroups]);

  const handleNodeClick = (node: SideNavItem) => {
    const hasChildren = node.children && node.children.length > 0;

    if (hasChildren) {
      // Parent with children clicked
      if (!open) {
        // Auto-expand side nav AND expand the branch to show children
        setWasAutoExpanded(true);
        setExpandedBranches([node.id]);
        setOpen(true);
      }
      // Branch expansion is handled by Qualcomm UI automatically
    } else {
      // Leaf item clicked - execute action
      // Note: QUI handles disabled state, so no need to check here
      onItemSelect(node.id);

      // Auto-collapse only if it was auto-expanded
      if (wasAutoExpanded) {
        setOpen(false);
        setWasAutoExpanded(false);
      }
    }
  };

  // Handle manual expansion via collapse trigger
  const handleOpenChange = (newOpen: boolean) => {
    // Only update state if this is a manual toggle (not from our setOpen call)
    // We detect manual toggle by checking if wasAutoExpanded is false
    if (newOpen && !wasAutoExpanded) {
      // User manually expanded - this is a manual action
      setOpen(newOpen);
    } else if (!newOpen) {
      // User manually collapsed
      setOpen(newOpen);
      setWasAutoExpanded(false);
    } else {
      // This is from our auto-expand, just update open state
      setOpen(newOpen);
    }
  };

  // Shared leaf markup for both the popover-trigger and plain-action cases —
  // only the button's event bindings and whether the shortcut is shown differ.
  const renderLeafInner = (
    node: SideNavItem,
    buttonProps: React.ComponentProps<'button'>,
    showShortcut: boolean,
  ) =>
    open ? (
      <SideNav.LeafNode render={<button {...buttonProps} type="button" />}>
        <SideNav.NodeIndicator />
        {node.icon ? <SideNav.NodeIcon icon={node.icon} /> : null}
        <SideNav.NodeText>{node.label}</SideNav.NodeText>
        {showShortcut && node.shortcut && (
          <span className="ml-auto text-xs">{node.shortcut}</span>
        )}
      </SideNav.LeafNode>
    ) : (
      <Tooltip
        positioning={{placement: 'right'}}
        trigger={
          <span>
            <SideNav.LeafNode
              render={<button {...buttonProps} type="button" />}
            >
              <SideNav.NodeIndicator />
              {node.icon ? <SideNav.NodeIcon icon={node.icon} /> : null}
            </SideNav.LeafNode>
          </span>
        }
      >
        {node.tooltip || node.label}
      </Tooltip>
    );

  const renderGroups = (groups: typeof allGroups) =>
    groups.map((group) => (
      <SideNav.Group key={group.key}>
        <SideNav.Divider />

        {group.key === 'ungrouped' ? null : (
          <SideNav.GroupLabel>{group.key}</SideNav.GroupLabel>
        )}

        {group.items.map(({indexPath, node}) => (
          <SideNav.Nodes
            key={collection.getNodeValue(node)}
            indexPath={indexPath}
            node={node}
            renderBranch={({node}) =>
              open ? (
                <SideNav.BranchNode
                  render={
                    <button
                      onClick={() => handleNodeClick(node)}
                      type="button"
                    />
                  }
                >
                  <SideNav.NodeIndicator />
                  {node.icon ? <SideNav.NodeIcon icon={node.icon} /> : null}
                  <SideNav.NodeText>{node.label}</SideNav.NodeText>
                  <SideNav.BranchTrigger />
                </SideNav.BranchNode>
              ) : (
                <Tooltip
                  positioning={{placement: 'right'}}
                  trigger={
                    <span>
                      <SideNav.BranchNode
                        render={
                          <button
                            onClick={() => handleNodeClick(node)}
                            type="button"
                          />
                        }
                      >
                        <SideNav.NodeIndicator />
                        {node.icon ? (
                          <SideNav.NodeIcon icon={node.icon} />
                        ) : null}
                        <SideNav.BranchTrigger />
                      </SideNav.BranchNode>
                    </span>
                  }
                >
                  {node.tooltip || node.label}
                </Tooltip>
              )
            }
            renderLeaf={({node}) =>
              node.popoverContent ? (
                <PopoverLeafItem isNavExpanded={open} node={node} />
              ) : (
                renderLeafInner(
                  node,
                  {onClick: () => handleNodeClick(node)},
                  true,
                )
              )
            }
          />
        ))}
      </SideNav.Group>
    ));

  return (
    <SideNav.Root
      collection={collection}
      expandedValue={expandedBranches}
      onExpandedValueChange={(details) =>
        setExpandedBranches(details.expandedValue)
      }
      onOpenChange={handleOpenChange}
      onSelectedValueChange={() => {}}
      open={open}
      selectedValue={[]}
      style={{
        backgroundColor: 'var(--color-surface-secondary)',
        color: 'var(--color-text-neutral-primary)',
        height: '100%',
      }}
    >
      <SideNav.Header>
        <SideNav.HeaderTitle>Menu</SideNav.HeaderTitle>
        <SideNav.CollapseTrigger />
      </SideNav.Header>

      <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        <div>{renderGroups(topGroupsData)}</div>
        <div style={{marginTop: 'auto'}}>{renderGroups(bottomGroupData)}</div>
      </div>
    </SideNav.Root>
  );
}
