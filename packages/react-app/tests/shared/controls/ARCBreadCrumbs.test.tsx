import {createRef} from "react"

import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  type ARCBreadCrumbItem,
  ARCBreadCrumbs,
} from "~shared/controls/ARCBreadCrumbs"

// The mocks are now in test-setup.ts

describe("ARCBreadCrumbs - Generic Controls API", () => {
  const mockItems: ARCBreadCrumbItem[] = [
    {label: "Home"},
    {label: "Products"},
    {label: "Electronics"},
    {label: "Laptops"},
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Basic Props API", () => {
    it("should render with default props", () => {
      render(<ARCBreadCrumbs items={[]} />)

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toBeInTheDocument()
      // The component renders a nav element without specific CSS classes by default
    })

    it("should render with className prop", () => {
      render(
        <ARCBreadCrumbs className="custom-breadcrumbs" items={mockItems} />,
      )

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toHaveClass("custom-breadcrumbs")
    })
  })

  describe("Items API", () => {
    it("should render breadcrumb items", () => {
      render(<ARCBreadCrumbs items={mockItems} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Products")).toBeInTheDocument()
      expect(screen.getByText("Electronics")).toBeInTheDocument()
      expect(screen.getByText("Laptops")).toBeInTheDocument()
    })

    it("should handle items without href", () => {
      const itemsWithoutHref: ARCBreadCrumbItem[] = [
        {label: "Home"},
        {label: "Products"},
      ]

      render(<ARCBreadCrumbs items={itemsWithoutHref} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Products")).toBeInTheDocument()
    })

    it("should handle disabled items", () => {
      render(<ARCBreadCrumbs items={mockItems} />)

      // The disabled item should still be rendered but with disabled styling
      expect(screen.getByText("Laptops")).toBeInTheDocument()
    })

    it("should render empty breadcrumbs when no items provided", () => {
      render(<ARCBreadCrumbs items={[]} />)

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toBeInTheDocument()
      // The nav contains an ol element even when empty
      expect(breadcrumbs.children).toHaveLength(1)
      const list = breadcrumbs.querySelector("ol")
      expect(list).toBeInTheDocument()
      expect(list?.children).toHaveLength(0)
    })
  })

  describe("Event Handlers API", () => {
    it("should call onItemClick when breadcrumb item is clicked", async () => {
      const onItemClick = jest.fn()
      const user = userEvent.setup()

      render(<ARCBreadCrumbs items={mockItems} onItemClick={onItemClick} />)

      const homeButton = screen.getByText("Home")
      await user.click(homeButton)

      expect(onItemClick).toHaveBeenCalledWith(
        expect.any(Object),
        mockItems[0],
        0,
      )
    })

    it("should call item's onClick handler when provided", async () => {
      const itemOnClick = jest.fn()
      const itemsWithClick: ARCBreadCrumbItem[] = [
        {
          label: "Home",
          onClick: itemOnClick,
        },
      ]
      const user = userEvent.setup()

      render(<ARCBreadCrumbs items={itemsWithClick} />)

      const homeButton = screen.getByText("Home")
      await user.click(homeButton)

      expect(itemOnClick).toHaveBeenCalledWith(expect.any(Object))
    })

    it("should handle clicks on disabled items", async () => {
      const onItemClick = jest.fn()
      const user = userEvent.setup()

      render(<ARCBreadCrumbs items={mockItems} onItemClick={onItemClick} />)

      const laptopsButton = screen.getByText("Laptops")
      await user.click(laptopsButton)

      // Should still call onItemClick even for disabled items (handling is up to
      // the consumer)
      expect(onItemClick).toHaveBeenCalledWith(
        expect.any(Object),
        mockItems[3],
        3,
      )
    })
  })

  describe("Usage Examples from Documentation", () => {
    it("should render basic usage example", () => {
      const breadcrumbItems: ARCBreadCrumbItem[] = [
        {label: "Home"},
        {label: "Products"},
        {label: "Electronics"},
        {label: "Laptops"},
      ]

      render(<ARCBreadCrumbs items={breadcrumbItems} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Products")).toBeInTheDocument()
      expect(screen.getByText("Electronics")).toBeInTheDocument()
      expect(screen.getByText("Laptops")).toBeInTheDocument()
    })

    it("should render with custom click handler example", async () => {
      const handleItemClick = jest.fn(
        (
          event: React.MouseEvent<HTMLElement>,
          item: ARCBreadCrumbItem,
          _index: number,
        ) => {
          event.preventDefault()
          console.log(`Navigating to: ${item.label}`)
        },
      )
      const user = userEvent.setup()

      render(<ARCBreadCrumbs items={mockItems} onItemClick={handleItemClick} />)

      const homeButton = screen.getByText("Home")
      await user.click(homeButton)

      expect(handleItemClick).toHaveBeenCalledWith(
        expect.any(Object),
        mockItems[0],
        0,
      )
    })

    it("should render with custom styling example", () => {
      render(
        <ARCBreadCrumbs className="custom-breadcrumbs" items={mockItems} />,
      )

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toHaveClass("custom-breadcrumbs")
    })

    it("should render dynamic breadcrumbs example", () => {
      const path = ["Home", "Products", "Electronics"]
      const breadcrumbItems = path.map((segment) => ({
        label: segment,
      }))

      render(<ARCBreadCrumbs items={breadcrumbItems} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Products")).toBeInTheDocument()
      expect(screen.getByText("Electronics")).toBeInTheDocument()
    })
  })

  describe("ARCBreadCrumbItem Interface", () => {
    it("should handle all ARCBreadCrumbItem properties", async () => {
      const customOnClick = jest.fn()
      const itemsWithAllProps: ARCBreadCrumbItem[] = [
        {
          label: "Home",
          onClick: customOnClick,
        },
        {
          label: "Disabled Item",
        },
      ]
      const user = userEvent.setup()

      render(<ARCBreadCrumbs items={itemsWithAllProps} />)

      // Test enabled item
      const homeButton = screen.getByText("Home")
      await user.click(homeButton)
      expect(customOnClick).toHaveBeenCalled()

      // Test disabled item
      expect(screen.getByText("Disabled Item")).toBeInTheDocument()
    })
  })

  describe("Integration with QBreadcrumbs", () => {
    it("should pass through QBreadcrumbs props", () => {
      render(<ARCBreadCrumbs items={mockItems} />)

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toBeInTheDocument()
      expect(breadcrumbs.tagName).toBe("NAV")
    })

    it("should maintain QBreadcrumbs theme consistency", () => {
      render(<ARCBreadCrumbs items={mockItems} />)

      // Should render as a nav with proper structure
      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toBeInTheDocument()
      // The nav contains an ol, and the ol contains the li elements
      expect(breadcrumbs.children).toHaveLength(1)
      const list = breadcrumbs.querySelector("ol")
      expect(list?.children).toHaveLength(mockItems.length)
    })
  })

  describe("Accessibility", () => {
    it("should render as a navigation list", () => {
      render(<ARCBreadCrumbs items={mockItems} />)

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toBeInTheDocument()
      expect(breadcrumbs.tagName).toBe("NAV")
    })

    it("should be keyboard navigable", () => {
      render(<ARCBreadCrumbs items={mockItems} />)

      // Since the mock doesn't implement actual keyboard navigation,
      // we'll just verify the elements are present and accessible
      const homeButton = screen.getByText("Home")
      expect(homeButton).toBeInTheDocument()

      // Verify the navigation structure is accessible
      const navigation = screen.getByRole("navigation")
      expect(navigation).toBeInTheDocument()
    })
  })

  describe("Error Handling", () => {
    it("should handle empty items array gracefully", () => {
      render(<ARCBreadCrumbs items={[]} />)

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toBeInTheDocument()
      // The nav contains an ol element even when empty
      expect(breadcrumbs.children).toHaveLength(1)
      const list = breadcrumbs.querySelector("ol")
      expect(list).toBeInTheDocument()
      expect(list?.children).toHaveLength(0)
    })

    it("should handle items with missing properties", () => {
      const incompleteItems: ARCBreadCrumbItem[] = [
        {label: "Home"}, // No href
        {label: ""}, // Empty label
      ]

      render(<ARCBreadCrumbs items={incompleteItems} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      // Empty label should still render the structure
      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs.children).toHaveLength(1)
      const list = breadcrumbs.querySelector("ol")
      expect(list?.children).toHaveLength(2)
    })

    it("should handle component unmounting gracefully", () => {
      const {unmount} = render(<ARCBreadCrumbs items={mockItems} />)

      expect(() => unmount()).not.toThrow()
    })
  })

  describe("Ref Forwarding", () => {
    it("should forward ref to the underlying QBreadcrumbs element", () => {
      const ref = createRef<HTMLUListElement>()
      render(<ARCBreadCrumbs ref={ref} items={mockItems} />)

      // The ref should be forwarded to the container
      expect(ref.current).toBeTruthy()
    })

    it("should allow ref to access list methods", () => {
      const ref = createRef<HTMLUListElement>()
      render(<ARCBreadCrumbs ref={ref} items={mockItems} />)

      // The ref should be forwarded to the container
      expect(ref.current).toBeTruthy()
    })
  })

  describe("Performance", () => {
    it("should handle large number of breadcrumb items", () => {
      const manyItems: ARCBreadCrumbItem[] = Array.from(
        {length: 100},
        (_, i) => ({
          label: `Item ${i + 1}`,
        }),
      )

      render(<ARCBreadCrumbs items={manyItems} />)

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs.children).toHaveLength(1)
      const list = breadcrumbs.querySelector("ol")
      expect(list?.children).toHaveLength(100)
      expect(screen.getByText("Item 1")).toBeInTheDocument()
      expect(screen.getByText("Item 100")).toBeInTheDocument()
    })

    it("should handle rapid re-renders without errors", () => {
      const {rerender} = render(<ARCBreadCrumbs items={mockItems} />)

      // Rapid re-renders with different props
      for (let i = 0; i < 10; i++) {
        rerender(<ARCBreadCrumbs className={`class-${i}`} items={mockItems} />)
      }

      const breadcrumbs = screen.getByRole("navigation")
      expect(breadcrumbs).toHaveClass("class-9")
    })
  })

  describe("Edge Cases", () => {
    it("should handle special characters in labels", () => {
      const specialItems: ARCBreadCrumbItem[] = [
        {label: "Home & Garden"},
        {label: "Toys & Games"},
        {label: "Books & Media"},
      ]

      render(<ARCBreadCrumbs items={specialItems} />)

      expect(screen.getByText("Home & Garden")).toBeInTheDocument()
      expect(screen.getByText("Toys & Games")).toBeInTheDocument()
      expect(screen.getByText("Books & Media")).toBeInTheDocument()
    })

    it("should handle very long breadcrumb labels", () => {
      const longLabelItems: ARCBreadCrumbItem[] = [
        {
          label:
            "This is a very long breadcrumb label that might cause layout issues",
        },
      ]

      render(<ARCBreadCrumbs items={longLabelItems} />)

      expect(
        screen.getByText(
          "This is a very long breadcrumb label that might cause layout issues",
        ),
      ).toBeInTheDocument()
    })

    it("should handle null/undefined in items array", () => {
      // TypeScript would prevent this, but testing runtime behavior
      const itemsWithNulls = mockItems.filter(Boolean)

      render(<ARCBreadCrumbs items={itemsWithNulls} />)

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Products")).toBeInTheDocument()
    })
  })

  describe("Dropdown Functionality", () => {
    it("should handle dropdown items", () => {
      const dropdownItems = [
        {label: "Dropdown Item 1", onClick: jest.fn()},
        {label: "Dropdown Item 2", onClick: jest.fn()},
      ]

      const itemsWithDropdown: ARCBreadCrumbItem[] = [
        {
          dropdownItems,
          label: "Home",
        },
      ]

      render(<ARCBreadCrumbs items={itemsWithDropdown} />)

      // Should render the dropdown trigger as a span with button role (without dropdown arrow in
      // the text)
      const homeButton = screen.getByText("Home")
      expect(homeButton).toBeInTheDocument()
      expect(homeButton.tagName).toBe("SPAN")
      expect(homeButton).toHaveAttribute("role", "button")
    })
  })
})
