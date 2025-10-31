import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import SearchBox from "~features/subsystem-browser/ui/SearchBox"

// Mock @qui/react's QTextInput to a simple input and a clear button
jest.mock("@qui/react", () => ({
  QTextInput: ({
    value,
    onChange,
    onClear,
    placeholder,
  }: {
    value: string
    onChange?: (event: React.SyntheticEvent, value: string, reason: string) => void
    onClear?: () => void
    placeholder?: string
  }) => (
    <div>
      <input
        aria-label="qtext-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e as any, (e.target as HTMLInputElement).value, "input")}
      />
      <button aria-label="clear" onClick={() => onClear?.()}>
        clear
      </button>
    </div>
  ),
}))

describe("SearchTextBox", () => {
  it("calls onChange with the new value when search text changes", () => {
    const handleChange = jest.fn()
    const handleClear = jest.fn()
    const searchterm = "abc"
    render(<SearchBox searchTerm={searchterm} onChange={handleChange} onClear={handleClear} />)

    const input = screen.getByLabelText("qtext-input")
    fireEvent.change(input, { target: { value: "def" } })

    expect(handleChange).toHaveBeenCalledWith("def")
  })

  it("calls onClear when clear button is clicked", () => {
    const handleChange = jest.fn()
    const handleClear = jest.fn()
    const searchterm = "abc"
    render(<SearchBox searchTerm={searchterm} onChange={handleChange} onClear={handleClear} />)

    fireEvent.click(screen.getByLabelText("clear"))
    expect(handleClear).toHaveBeenCalled()
  })
})