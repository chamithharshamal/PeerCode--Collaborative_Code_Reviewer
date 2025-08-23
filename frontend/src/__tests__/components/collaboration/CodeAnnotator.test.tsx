import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { CodeAnnotator } from "@/components/collaboration/CodeAnnotator";
import { Annotation } from "@/types";

// Mock window.getSelection
const mockGetSelection = jest.fn();
Object.defineProperty(window, "getSelection", {
  writable: true,
  value: mockGetSelection,
});

describe("CodeAnnotator", () => {
  const mockCode = `function hello() {
  console.log("Hello, World!");
  return true;
}`;

  const mockAnnotations: Annotation[] = [
    {
      id: "annotation-1",
      userId: "user-1",
      sessionId: "session-1",
      lineStart: 1,
      lineEnd: 1,
      columnStart: 2,
      columnEnd: 15,
      content: "This is a comment",
      type: "comment",
      createdAt: new Date("2023-01-01"),
    },
  ];

  const mockOnAddAnnotation = jest.fn();
  const mockOnAnnotationClick = jest.fn();
  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSelection.mockReturnValue({
      isCollapsed: true,
      removeAllRanges: jest.fn(),
    });
  });

  const defaultProps = {
    code: mockCode,
    language: "javascript",
    annotations: mockAnnotations,
    onAddAnnotation: mockOnAddAnnotation,
    onAnnotationClick: mockOnAnnotationClick,
    onSelectionChange: mockOnSelectionChange,
  };

  it("should render code with line numbers", () => {
    render(<CodeAnnotator {...defaultProps} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByText("function hello() {")).toBeInTheDocument();
    expect(
      screen.getByText('console.log("Hello, World!");')
    ).toBeInTheDocument();
    expect(screen.getByText("return true;")).toBeInTheDocument();
    expect(screen.getByText("}")).toBeInTheDocument();
  });

  it("should display annotation indicators", () => {
    render(<CodeAnnotator {...defaultProps} />);

    // Should show annotation indicator on line 2 (index 1)
    const annotationIndicators = screen.getAllByRole("button");
    expect(annotationIndicators.length).toBeGreaterThan(0);
  });

  it("should call onAnnotationClick when annotation indicator is clicked", async () => {
    const user = userEvent.setup();
    render(<CodeAnnotator {...defaultProps} />);

    const annotationIndicator = screen.getAllByRole("button")[0];
    await user.click(annotationIndicator);

    expect(mockOnAnnotationClick).toHaveBeenCalledWith(mockAnnotations[0]);
  });

  it("should show annotation form when text is selected", async () => {
    const user = userEvent.setup();

    // Mock text selection
    const mockRange = {
      startContainer: document.createTextNode("test"),
      startOffset: 0,
      endContainer: document.createTextNode("test"),
      endOffset: 4,
      commonAncestorContainer: document.createElement("div"),
    };

    mockGetSelection.mockReturnValue({
      isCollapsed: false,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
    });

    render(<CodeAnnotator {...defaultProps} />);

    const codeElement = screen.getByText("function hello() {").closest("pre")!;

    // Simulate mouse up to trigger selection
    fireEvent.mouseUp(codeElement);

    // Should show "Add Annotation" button
    await waitFor(() => {
      expect(screen.getByText("Add Annotation")).toBeInTheDocument();
    });
  });

  it("should show annotation form when Add Annotation button is clicked", async () => {
    const user = userEvent.setup();

    // Mock text selection
    const mockRange = {
      startContainer: document.createTextNode("test"),
      startOffset: 0,
      endContainer: document.createTextNode("test"),
      endOffset: 4,
      commonAncestorContainer: document.createElement("div"),
    };

    mockGetSelection.mockReturnValue({
      isCollapsed: false,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
    });

    render(<CodeAnnotator {...defaultProps} />);

    const codeElement = screen.getByText("function hello() {").closest("pre")!;
    fireEvent.mouseUp(codeElement);

    await waitFor(() => {
      expect(screen.getByText("Add Annotation")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Annotation");
    await user.click(addButton);

    // Should show annotation form
    expect(screen.getByText(/Add Annotation \(Lines/)).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should submit annotation when form is filled and submitted", async () => {
    const user = userEvent.setup();

    // Mock text selection
    const mockRange = {
      startContainer: document.createTextNode("test"),
      startOffset: 0,
      endContainer: document.createTextNode("test"),
      endOffset: 4,
      commonAncestorContainer: document.createElement("div"),
    };

    mockGetSelection.mockReturnValue({
      isCollapsed: false,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
    });

    render(<CodeAnnotator {...defaultProps} />);

    const codeElement = screen.getByText("function hello() {").closest("pre")!;
    fireEvent.mouseUp(codeElement);

    await waitFor(() => {
      expect(screen.getByText("Add Annotation")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Annotation");
    await user.click(addButton);

    // Fill form
    const contentTextarea = screen.getByLabelText("Content");
    await user.type(contentTextarea, "Test annotation content");

    const typeSelect = screen.getByLabelText("Type");
    await user.selectOptions(typeSelect, "suggestion");

    // Submit form
    const submitButton = screen.getByRole("button", { name: "Add" });
    await user.click(submitButton);

    expect(mockOnAddAnnotation).toHaveBeenCalledWith({
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
      content: "Test annotation content",
      type: "suggestion",
    });
  });

  it("should cancel annotation form when Cancel button is clicked", async () => {
    const user = userEvent.setup();

    // Mock text selection
    const mockRange = {
      startContainer: document.createTextNode("test"),
      startOffset: 0,
      endContainer: document.createTextNode("test"),
      endOffset: 4,
      commonAncestorContainer: document.createElement("div"),
    };

    mockGetSelection.mockReturnValue({
      isCollapsed: false,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
    });

    render(<CodeAnnotator {...defaultProps} />);

    const codeElement = screen.getByText("function hello() {").closest("pre")!;
    fireEvent.mouseUp(codeElement);

    await waitFor(() => {
      expect(screen.getByText("Add Annotation")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Annotation");
    await user.click(addButton);

    // Cancel form
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    // Form should be hidden
    expect(
      screen.queryByText(/Add Annotation \(Lines/)
    ).not.toBeInTheDocument();
    expect(mockOnSelectionChange).toHaveBeenCalledWith(null);
  });

  it("should not submit annotation with empty content", async () => {
    const user = userEvent.setup();

    // Mock text selection
    const mockRange = {
      startContainer: document.createTextNode("test"),
      startOffset: 0,
      endContainer: document.createTextNode("test"),
      endOffset: 4,
      commonAncestorContainer: document.createElement("div"),
    };

    mockGetSelection.mockReturnValue({
      isCollapsed: false,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
    });

    render(<CodeAnnotator {...defaultProps} />);

    const codeElement = screen.getByText("function hello() {").closest("pre")!;
    fireEvent.mouseUp(codeElement);

    await waitFor(() => {
      expect(screen.getByText("Add Annotation")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Annotation");
    await user.click(addButton);

    // Try to submit without content
    const submitButton = screen.getByRole("button", { name: "Add" });
    expect(submitButton).toBeDisabled();

    expect(mockOnAddAnnotation).not.toHaveBeenCalled();
  });

  it("should display different colors for different annotation types", () => {
    const multipleAnnotations: Annotation[] = [
      { ...mockAnnotations[0], type: "comment" },
      { ...mockAnnotations[0], id: "annotation-2", type: "suggestion" },
      { ...mockAnnotations[0], id: "annotation-3", type: "question" },
    ];

    render(
      <CodeAnnotator {...defaultProps} annotations={multipleAnnotations} />
    );

    // Should render different colored indicators
    const indicators = screen.getAllByRole("button");
    expect(indicators.length).toBeGreaterThan(2);
  });

  it("should handle empty code gracefully", () => {
    render(<CodeAnnotator {...defaultProps} code="" />);

    // Should still render the code container
    expect(screen.getByText(" ")).toBeInTheDocument();
  });

  it("should handle annotations with multiple lines", () => {
    const multiLineAnnotation: Annotation = {
      ...mockAnnotations[0],
      lineStart: 0,
      lineEnd: 2,
    };

    render(
      <CodeAnnotator {...defaultProps} annotations={[multiLineAnnotation]} />
    );

    // Should show indicators on multiple lines
    const indicators = screen.getAllByRole("button");
    expect(indicators.length).toBeGreaterThan(0);
  });
});
