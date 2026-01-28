import {fireEvent, render, screen} from "@testing-library/react"

import SearchBox from "~features/subsystem-browser/ui/SearchBox"

describe("SearchTextBox", () => {
  it("calls onChange with the new value when search text changes", () => {
    const handleChange = jest.fn()
    const handleClear = jest.fn()
    const searchterm = "abc"
    render(
      <SearchBox
        onChange={handleChange}
        onClear={handleClear}
        searchTerm={searchterm}
      />,
    )

    const input = screen.getByLabelText("qtext-input")
    fireEvent.change(input, {target: {value: "def"}})

    expect(handleChange).toHaveBeenCalledWith("def")
  })

  it("calls onClear when clear button is clicked", () => {
    const handleChange = jest.fn()
    const handleClear = jest.fn()
    const searchterm = "abc"
    render(
      <SearchBox
        onChange={handleChange}
        onClear={handleClear}
        searchTerm={searchterm}
      />,
    )

    const clearButton = screen.getByLabelText("clear")
    fireEvent.click(clearButton)

    // The SearchBox calls onValueChange with empty string, which triggers both onChange and onClear
    expect(handleChange).toHaveBeenCalledWith("")
    expect(handleClear).toHaveBeenCalled()
  })
})
