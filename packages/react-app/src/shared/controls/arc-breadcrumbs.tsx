/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {forwardRef, type ReactNode, useCallback, useState} from 'react';

import {ChevronDown} from 'lucide-react';

import {Breadcrumbs} from '@qualcomm-ui/react/breadcrumbs';
import {Menu} from '@qualcomm-ui/react/menu';
import {Popover} from '@qualcomm-ui/react/popover';

export interface ArcBreadcrumbDropdownItem {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface ArcBreadcrumbItem {
  /**
   * Optional dropdown items to show when this breadcrumb is clicked
   */
  dropdownItems?: ArcBreadcrumbDropdownItem[];
  /**
   * The label text for the breadcrumb
   */
  label: string;
  /**
   * Custom click handler for the breadcrumb item
   */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface ArcBreadcrumbsProps {
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * Array of breadcrumb items
   */
  items: ArcBreadcrumbItem[];
  /**
   * Callback when a breadcrumb item is clicked
   */
  onItemClick?: (
    event: React.MouseEvent<HTMLElement>,
    item: ArcBreadcrumbItem,
    index: number,
  ) => void;
}

/**
 * ArcBreadcrumbs - A breadcrumb control using the new Breadcrumbs from qualcomm-ui
 * with enhanced functionality for click handling and dropdown support
 */
export const ArcBreadcrumbs = forwardRef<HTMLElement, ArcBreadcrumbsProps>(
  ({className, items = [], onItemClick}, ref) => {
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
      null,
    );

    // Handle dropdown item click
    const handleDropdownItemClick = useCallback(
      (
        event: React.MouseEvent<HTMLElement>,
        dropdownItem: ArcBreadcrumbDropdownItem,
      ) => {
        event.stopPropagation();
        dropdownItem.onClick?.(event);
        setOpenDropdownIndex(null);
      },
      [],
    );

    // Handle breadcrumb item click with dropdown support
    const handleBreadcrumbClick = useCallback(
      (
        event: React.MouseEvent<HTMLElement>,
        item: ArcBreadcrumbItem,
        index: number,
      ) => {
        item.onClick?.(event);
        onItemClick?.(event, item, index);
        setOpenDropdownIndex(null);
      },
      [onItemClick],
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.currentTarget.click();
      }
    };

    const handleDropdownKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.currentTarget.click();
        }
      },
      [],
    );

    const renderBreadcrumbItem = (
      item: ArcBreadcrumbItem,
      index: number,
    ) => {
      const hasDropdown =
        item.dropdownItems && item.dropdownItems.length > 0;

      return (
        <Breadcrumbs.Item key={index}>
          {hasDropdown ? (
            <Popover.Root
              onOpenChange={(open: boolean) => {
                if (!open) {
                  setOpenDropdownIndex(null);
                }
              }}
              open={openDropdownIndex === index}
              positioning={{
                gutter: 4,
                placement: 'bottom-start',
                strategy: 'fixed',
              }}
            >
              <Popover.Anchor className="inline-flex items-center">
                {item.onClick || onItemClick ? (
                  <span
                    className="font-body-md text-neutral-secondary hover:bg-secondary hover:text-neutral-primary focus:outline-primary inline-flex cursor-pointer items-center rounded px-2 py-1 whitespace-nowrap transition-colors focus:outline-2 focus:outline-offset-2"
                    onClick={(event: React.MouseEvent<HTMLElement>) =>
                      handleBreadcrumbClick(event, item, index)
                    }
                    onKeyDown={(event: React.KeyboardEvent<HTMLElement>) =>
                      handleKeyDown(event)
                    }
                    role="button"
                    tabIndex={0}
                  >
                    {item.label}
                  </span>
                ) : (
                  <span className="font-body-md text-neutral-primary inline-flex items-center px-2 py-1 whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                <Popover.Trigger>
                  {(triggerProps) => (
                    <button
                      {...triggerProps}
                      aria-label={`Show children of ${item.label}`}
                      className="text-neutral-secondary hover:bg-secondary hover:text-neutral-primary focus:outline-primary inline-flex cursor-pointer items-center rounded p-1 transition-colors focus:outline-2 focus:outline-offset-2"
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>,
                      ) => {
                        event.stopPropagation();
                        setOpenDropdownIndex(
                          openDropdownIndex === index ? null : index,
                        );
                        triggerProps.onClick?.(event);
                      }}
                      type="button"
                    >
                      <ChevronDown aria-hidden size={16} />
                    </button>
                  )}
                </Popover.Trigger>
              </Popover.Anchor>
              <Popover.Positioner>
                <Popover.Content
                  className="bg-primary border-neutral-02 z-[9999] min-w-[150px] rounded-md border p-2 shadow-lg"
                  data-dropdown-index={index}
                >
                  <div className="flex flex-col gap-1">
                    {item.dropdownItems!.map(
                      (dropdownItem, dropdownIndex) => (
                        <div
                          key={`dropdown-${dropdownIndex}`}
                          className={`font-body-sm focus:outline-primary flex w-full items-center justify-start rounded px-3 py-2 transition-colors focus:outline-2 focus:-outline-offset-2 ${
                            dropdownItem.disabled
                              ? 'text-neutral-secondary cursor-not-allowed opacity-50'
                              : 'text-neutral-primary hover:bg-secondary cursor-pointer'
                          }`}
                          onClick={(
                            event: React.MouseEvent<HTMLDivElement>,
                          ) => {
                            if (!dropdownItem.disabled) {
                              handleDropdownItemClick(event, dropdownItem);
                            }
                          }}
                          onKeyDown={(
                            event: React.KeyboardEvent<HTMLDivElement>,
                          ) => {
                            handleDropdownKeyDown(event);
                          }}
                          role="menuitem"
                          tabIndex={dropdownItem.disabled ? -1 : 0}
                        >
                          {dropdownItem.icon && (
                            <span className="mr-2 text-base">
                              {dropdownItem.icon}
                            </span>
                          )}
                          <span className="flex-1">{dropdownItem.label}</span>
                        </div>
                      ),
                    )}
                  </div>
                </Popover.Content>
              </Popover.Positioner>
            </Popover.Root>
          ) : item.onClick || onItemClick ? (
            <span
              className="font-body-md text-neutral-secondary hover:bg-secondary hover:text-neutral-primary focus:outline-primary inline-flex cursor-pointer items-center rounded px-2 py-1 whitespace-nowrap transition-colors focus:outline-2 focus:outline-offset-2"
              onClick={(event: React.MouseEvent<HTMLElement>) =>
                handleBreadcrumbClick(event, item, index)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLElement>) =>
                handleKeyDown(event)
              }
              role="button"
              tabIndex={0}
            >
              {item.label}
            </span>
          ) : (
            <span className="font-body-md text-neutral-primary inline-flex items-center px-2 py-1 whitespace-nowrap">
              {item.label}
            </span>
          )}
        </Breadcrumbs.Item>
      );
    };

    const hasOverflow = items.length > 4;
    const overflowItems = hasOverflow ? items.slice(2, -1) : [];

    return (
      <div className="relative min-h-8 w-full overflow-hidden">
        <Breadcrumbs.Root ref={ref} className={className}>
          <Breadcrumbs.List>
            {hasOverflow ? (
              <>
                {renderBreadcrumbItem(items[0], 0)}
                {renderBreadcrumbItem(items[1], 1)}
                <Breadcrumbs.OverflowItem aria-label="Show hidden breadcrumbs">
                  {overflowItems.map((item, index) => {
                    const itemIndex = index + 2;
                    const isClickable = item.onClick || onItemClick;

                    return (
                      <Menu.Item
                        key={itemIndex}
                        disabled={!isClickable}
                        onClick={
                          isClickable
                            ? (event: React.MouseEvent<HTMLButtonElement>) =>
                                handleBreadcrumbClick(event, item, itemIndex)
                            : undefined
                        }
                        value={`breadcrumb-${itemIndex}`}
                      >
                        {item.label}
                      </Menu.Item>
                    );
                  })}
                </Breadcrumbs.OverflowItem>
                {renderBreadcrumbItem(items[items.length - 1], items.length - 1)}
              </>
            ) : (
              items.map(renderBreadcrumbItem)
            )}
          </Breadcrumbs.List>
        </Breadcrumbs.Root>
      </div>
    );
  },
);

ArcBreadcrumbs.displayName = 'ArcBreadcrumbs';

export default ArcBreadcrumbs;
