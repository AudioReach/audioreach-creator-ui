import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {type QBreadcrumbItem, QBreadcrumbs, QButton, QPopover} from "@qui/react"

import "./ARCBreadCrumbs.css"

export interface ARCBreadcrumbDropdownItem {
  disabled?: boolean
  icon?: ReactNode
  label: string
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
}

export interface ARCBreadCrumbItem extends Omit<QBreadcrumbItem, "render"> {
  /**
   * Optional dropdown items to show when this breadcrumb is clicked
   */
  dropdownItems?: ARCBreadcrumbDropdownItem[]
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
 * ARCBreadCrumbs - A breadcrumb control that inherits from QBreadcrumbs
 * with enhanced functionality for click handling and customization
 */
export const ARCBreadCrumbs = forwardRef<HTMLUListElement, ARCBreadCrumbsProps>(
  ({className, items = [], onItemClick}, ref) => {
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
      null,
    )
    const [dropdownPosition, setDropdownPosition] = useState<{
      left: number
      top: number
    }>({left: 0, top: 0})
    const containerRef = useRef<HTMLDivElement>(null)
    const topMargin = 4

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

          // Calculate position relative to container
          if (containerRef.current) {
            const clickedElement = event.currentTarget
            const containerRect = containerRef.current.getBoundingClientRect()
            const elementRect = clickedElement.getBoundingClientRect()

            setDropdownPosition({
              left: elementRect.left - containerRect.left,
              top: elementRect.bottom - containerRect.top + topMargin,
            })
          }

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
        if (openDropdownIndex !== null && containerRef.current) {
          const target = event.target as Node
          if (!containerRef.current.contains(target)) {
            setOpenDropdownIndex(null)
          }
        }
      }

      if (openDropdownIndex !== null) {
        document.addEventListener("click", handleClickOutside)
      }

      return () => {
        document.removeEventListener("click", handleClickOutside)
      }
    }, [openDropdownIndex])

    // Transform our items to QBreadcrumbItem format
    const qBreadcrumbItems: QBreadcrumbItem[] = items.map((item, index) => {
      const {dropdownItems, onClick, ...qBreadcrumbProps} = item
      const hasDropdown = dropdownItems && dropdownItems.length > 0

      // Create the render element
      let renderElement: React.ReactElement

      if (hasDropdown || onClick || onItemClick) {
        // If has dropdown or click handlers are provided, create a clickable element
        renderElement = (
          <button
            onClick={(event) => handleBreadcrumbClick(event, item, index)}
            type="button"
          >
            {item.label}
          </button>
        )
      } else {
        // Default: just render the label as text
        renderElement = <span>{item.label}</span>
      }

      return {
        ...qBreadcrumbProps,
        render: renderElement,
      }
    })

    return (
      <div ref={containerRef} className="arc-breadcrumbs-container">
        <QBreadcrumbs
          ref={ref}
          className={className}
          items={qBreadcrumbItems}
        />

        {/* Render dropdown overlays using QPopover for theming */}
        {items.map((item, index) => {
          const hasDropdown =
            item.dropdownItems && item.dropdownItems.length > 0
          const isDropdownOpen = openDropdownIndex === index

          if (!isDropdownOpen || !hasDropdown) {
            return null
          }

          return (
            <div
              key={`dropdown-${index}`}
              className="arc-dropdown-overlay"
              style={
                {
                  "--dropdown-left": `${dropdownPosition.left}px`,
                  "--dropdown-top": `${dropdownPosition.top}px`,
                } as React.CSSProperties
              }
            >
              <QPopover>
                <div className="arc-dropdown-container">
                  {item.dropdownItems!.map((dropdownItem, dropdownIndex) => (
                    <QButton
                      key={`dropdown-${dropdownIndex}`}
                      disabled={dropdownItem.disabled}
                      onClick={(event) => {
                        if (!dropdownItem.disabled) {
                          handleDropdownItemClick(event, dropdownItem)
                        }
                      }}
                      variant="ghost"
                    >
                      {dropdownItem.icon && (
                        <span className="arc-dropdown-item-icon">
                          {dropdownItem.icon}
                        </span>
                      )}
                      <span className="arc-dropdown-item-label">
                        {dropdownItem.label}
                      </span>
                    </QButton>
                  ))}
                </div>
              </QPopover>
            </div>
          )
        })}
      </div>
    )
  },
)

ARCBreadCrumbs.displayName = "ARCBreadCrumbs"

export default ARCBreadCrumbs
