import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import RoomSearchBar from "../RoomSearchBar";

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
    const { getByPlaceholderText } = render(
      <RoomSearchBar {...defaultProps} />,
    );

    expect(getByPlaceholderText("Enter room (e.g., H-820)")).toBeTruthy();
  });

  it("displays the passed value", () => {
    const { getByDisplayValue } = render(
      <RoomSearchBar {...defaultProps} value="H-851" />,
    );

    expect(getByDisplayValue("H-851")).toBeTruthy();
  });

  it("calls onChangeText when typing", () => {
    const mockChange = jest.fn();
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} onChangeText={mockChange} />,
    );

    fireEvent.changeText(getByTestId("room-search-input"), "MB1.210");

    expect(mockChange).toHaveBeenCalledWith("MB1.210");
  });

  it("calls onSubmit when submit editing", () => {
    const mockSubmit = jest.fn();
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} onSubmit={mockSubmit} />,
    );

    fireEvent(getByTestId("room-search-input"), "submitEditing");

    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows clear button when value is not empty", () => {
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} value="H-820" />,
    );

    expect(getByTestId("room-search-clear")).toBeTruthy();
  });

  it("does not show clear button when value is empty", () => {
    const { queryByTestId } = render(
      <RoomSearchBar {...defaultProps} value="" />,
    );

    expect(queryByTestId("room-search-clear")).toBeNull();
  });

  it("calls onClear when clear button is pressed", () => {
    const mockClear = jest.fn();
    const { getByTestId } = render(
      <RoomSearchBar {...defaultProps} value="H-820" onClear={mockClear} />,
    );

    fireEvent.press(getByTestId("room-search-clear"));

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it("displays error message when error is provided", () => {
    const { getByText } = render(
      <RoomSearchBar {...defaultProps} error="Room not found" />,
    );

    expect(getByText("Room not found")).toBeTruthy();
  });

  it("does not display error message when error is null", () => {
    const { queryByText } = render(
      <RoomSearchBar {...defaultProps} error={null} />,
    );

    expect(queryByText("Room not found")).toBeNull();
  });
});
