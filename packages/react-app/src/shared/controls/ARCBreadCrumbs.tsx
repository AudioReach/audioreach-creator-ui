import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react"

import {Breadcrumbs} from "@qualcomm-ui/react/breadcrumbs"
import {Popover} from "@qualcomm-ui/react/popover"

export interface ARCBreadcrumbDropdownItem {
  disabled?: boolean
  icon?: ReactNode
  label: string
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export interface ARCBreadCrumbItem {
  /**
   * Optional dropdown items to show when this breadcrumb is clicked
   */
  dropdownItems?: ARCBreadcrumbDropdownItem[]
  /**
   * The label text for the breadcrumb
   */
  label: string
  /**
   * Custom click handler for the breadcrumb item
   */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export interface ARCBreadCrumbsProps {
  /**
   * Additional CSS class names
   */
  className?: string
  /**
   * Array of breadcrumb items
   */
  items: ARCBreadCrumbItem[]
  /**
   * Callback when a breadcrumb item is clicked
   */
  onItemClick?: (
    event: React.MouseEvent<HTMLElement>,
    item: ARCBreadCrumbItem,
    index: number,
  ) => void
}

/**
 * ARCBreadCrumbs - A breadcrumb control using the new Breadcrumbs from qualcomm-ui
 * with enhanced functionality for click handling and dropdown support
 */
export const ARCBreadCrumbs = forwardRef<HTMLElement, ARCBreadCrumbsProps>(
  ({className, items = [], onItemClick}, ref) => {
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
      null,
    )

    // Handle dropdown item click
    const handleDropdownItemClick = useCallback(
      (
        event: React.MouseEvent<HTMLElement>,
        dropdownItem: ARCBreadcrumbDropdownItem,
      ) => {
        event.stopPropagation()
        dropdownItem.onClick?.(event)
        setOpenDropdownIndex(null)
      },
      [],
    )

    // Handle breadcrumb item click with dropdown support
    const handleBreadcrumbClick = useCallback(
      (
        event: React.MouseEvent<HTMLElement>,
        item: ARCBreadCrumbItem,
        index: number,
      ) => {
        const hasDropdown = item.dropdownItems && item.dropdownItems.length > 0

        if (hasDropdown) {
          event.preventDefault()
          event.stopPropagation()
          setOpenDropdownIndex(openDropdownIndex === index ? null : index)
        } else {
          item.onClick?.(event)
          onItemClick?.(event, item, index)
          setOpenDropdownIndex(null)
        }
      },
      [openDropdownIndex, onItemClick],
    )

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (openDropdownIndex !== null) {
          const target = event.target as Node
          requestAnimationFrame(() => {
            const dropdownContent = document.querySelector(
              `[data-dropdown-index="${openDropdownIndex}"]`,
            )
            if (dropdownContent && !dropdownContent.contains(target)) {
              setOpenDropdownIndex(null)
            }
          })
        }
      }

      if (openDropdownIndex !== null) {
        document.addEventListener("mousedown", handleClickOutside)
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }, [openDropdownIndex])

    const handleKeyDown = (
      event: React.KeyboardEvent<HTMLElement>,
      item: ARCBreadCrumbItem,
      index: number,
    ) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        handleBreadcrumbClick(event as any, item, index)
      }
    }

    const handleDropdownKeyDown = useCallback(
      (
        event: React.KeyboardEvent<HTMLDivElement>,
        dropdownItem: ARCBreadcrumbDropdownItem,
      ) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (!dropdownItem.disabled) {
            handleDropdownItemClick(event as any, dropdownItem)
          }
        }
      },
      [handleDropdownItemClick],
    )

    return (
      <div className="relative min-h-8 w-full overflow-visible">
        <Breadcrumbs.Root ref={ref} className={className}>
          <Breadcrumbs.List>
            {items.map((item, index) => {
              const hasDropdown =
                item.dropdownItems && item.dropdownItems.length > 0

              return (
                <Breadcrumbs.Item key={index}>
                  {hasDropdown ? (
                    // For items with dropdown, use Popover outside of Breadcrumbs structure
                    <Popover.Root
                      onOpenChange={(open: boolean) => {
                        if (!open) {
                          setOpenDropdownIndex(null)
                        }
                      }}
                      open={openDropdownIndex === index}
                      positioning={{
                        gutter: 4,
                        placement: "bottom-start",
                        strategy: "absolute",
                      }}
                    >
                      <Popover.Trigger>
                        {(triggerProps) => (
                          <span
                            {...triggerProps}
                            className="font-body-md text-text-2 hover:bg-background-3 hover:text-text-1 focus:outline-primary inline-flex cursor-pointer items-center rounded px-2 py-1 transition-colors focus:outline-2 focus:outline-offset-2"
                            onClick={(event: React.MouseEvent<HTMLElement>) => {
                              handleBreadcrumbClick(event, item, index)
                              triggerProps.onClick?.(event as any)
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {item.label}
                          </span>
                        )}
                      </Popover.Trigger>
                      <Popover.Content
                        className="bg-background-1 border-border-1 z-[9999] min-w-[150px] rounded-md border p-2 shadow-lg"
                        data-dropdown-index={index}
                      >
                        <div className="flex flex-col gap-1">
                          {item.dropdownItems!.map(
                            (dropdownItem, dropdownIndex) => (
                              <div
                                key={`dropdown-${dropdownIndex}`}
                                className={`font-body-sm focus:outline-primary flex w-full items-center justify-start rounded px-3 py-2 transition-colors focus:outline-2 focus:-outline-offset-2 ${
                                  dropdownItem.disabled
                                    ? "text-text-3 cursor-not-allowed opacity-50"
                                    : "text-text-1 hover:bg-background-3 cursor-pointer"
                                }`}
                                onClick={(
                                  event: React.MouseEvent<HTMLDivElement>,
                                ) => {
                                  if (!dropdownItem.disabled) {
                                    handleDropdownItemClick(event, dropdownItem)
                                  }
                                }}
                                onKeyDown={(
                                  event: React.KeyboardEvent<HTMLDivElement>,
                                ) => {
                                  handleDropdownKeyDown(event, dropdownItem)
                                }}
                                role="menuitem"
                                tabIndex={dropdownItem.disabled ? -1 : 0}
                              >
                                {dropdownItem.icon && (
                                  <span className="mr-2 text-base">
                                    {dropdownItem.icon}
                                  </span>
                                )}
                                <span className="flex-1">
                                  {dropdownItem.label}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </Popover.Content>
                    </Popover.Root>
                  ) : item.onClick || onItemClick ? (
                    // For clickable items without dropdown
                    <span
                      className="font-body-md text-text-2 hover:bg-background-3 hover:text-text-1 focus:outline-primary inline-flex cursor-pointer items-center rounded px-2 py-1 transition-colors focus:outline-2 focus:outline-offset-2"
                      onClick={(event: React.MouseEvent<HTMLElement>) =>
                        handleBreadcrumbClick(event, item, index)
                      }
                      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) =>
                        handleKeyDown(event, item, index)
                      }
                      role="button"
                      tabIndex={0}
                    >
                      {item.label}
                    </span>
                  ) : (
                    // For non-clickable items
                    <span className="font-body-md text-text-1 inline-flex items-center px-2 py-1">
                      {item.label}
                    </span>
                  )}
                </Breadcrumbs.Item>
              )
            })}
          </Breadcrumbs.List>
        </Breadcrumbs.Root>
      </div>
    )
  },
)

ARCBreadCrumbs.displayName = "ARCBreadCrumbs"

export default ARCBreadCrumbs
