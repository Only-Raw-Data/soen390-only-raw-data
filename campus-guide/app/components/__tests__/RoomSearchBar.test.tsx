import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import RoomSearchBar from "@/app/components/RoomSearchBar";

describe("RoomSearchBar", () => {
  const defaultProps = {
    value: "",
    onChangeText: jest.fn(),
    onSubmit: jest.fn(),
    onClear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with placeholder text", () => {
    // Arrange + Act
    const { getByPlaceholderText } = render(
      <RoomSearchBar {...defaultProps} />,
    );

    // Assert
    expect(getByPlaceholderText("Enter room (e.g., H-820)")).toBeTruthy();
  });

  it("displays the passed value", () => {
    // Arrange + Act
    const { getByDisplayValue } = render(
      <RoomSearchBar {...defaultProps} value="H-851" />,
    );

    // Assert
    expect(getByDisplayValue("H-851")).toBeTruthy();
  });

  it("calls onChangeText when typing", () => {
    // Arrange
    const mockChange = jest.fn();
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} onChangeText={mockChange} />,
    );

    // Act
    fireEvent.changeText(getByTestId("room-search-input"), "MB1.210");

    // Assert
    expect(mockChange).toHaveBeenCalledWith("MB1.210");
  });

  it("calls onSubmit when submit editing", () => {
    // Arrange
    const mockSubmit = jest.fn();
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} onSubmit={mockSubmit} />,
    );

    // Act
    fireEvent(getByTestId("room-search-input"), "submitEditing");

    // Assert
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows clear button when value is not empty", () => {
    // Arrange + Act
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} value="H-820" />,
    );

    // Assert
    expect(getByTestId("room-search-clear")).toBeTruthy();
  });

  it("does not show clear button when value is empty", () => {
    // Arrange + Act
    const { queryByTestId } = render(
      <RoomSearchBar {...defaultProps} value="" />,
    );

    // Assert
    expect(queryByTestId("room-search-clear")).toBeNull();
  });

  it("calls onClear when clear button is pressed", () => {
    // Arrange
    const mockClear = jest.fn();
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} value="H-820" onClear={mockClear} />,
    );

    // Act
    fireEvent.press(getByTestId("room-search-clear"));

    // Assert
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it("displays error message when error is provided", () => {
    // Arrange + Act
    const { getByText } = render(
      <RoomSearchBar {...defaultProps} error="Room not found" />,
    );

    // Assert
    expect(getByText("Room not found")).toBeTruthy();
  });

  it("does not display error message when error is null", () => {
    // Arrange + Act
    const { queryByText } = render(
      <RoomSearchBar {...defaultProps} error={null} />,
    );

    // Assert
    expect(queryByText("Room not found")).toBeNull();
  });
});
