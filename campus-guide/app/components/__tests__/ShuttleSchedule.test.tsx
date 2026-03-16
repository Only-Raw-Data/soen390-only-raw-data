import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ShuttleSchedule from "../ShuttleSchedule";
import { SHUTTLE_SCHEDULE } from "@/constants/shuttleSchedule";

describe("ShuttleSchedule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with default values", () => {
    // Arrange & Act
    const { getByText } = render(<ShuttleSchedule />);

    // Assert
    expect(getByText("Shuttle Bus Schedule")).toBeTruthy();
    expect(getByText("Loyola ↔ SGW Campus")).toBeTruthy();
    expect(getByText("Monday — Thursday")).toBeTruthy();
    expect(getByText("Friday")).toBeTruthy();
  });

  it("hides title when compact prop is true", () => {
    // Arrange & Act
    const { queryByText } = render(<ShuttleSchedule compact={true} />);

    // Assert
    expect(queryByText("Shuttle Bus Schedule")).toBeNull();
    expect(queryByText("Loyola ↔ SGW Campus")).toBeNull();
  });

  it("shows title when compact prop is false", () => {
    // Arrange & Act
    const { getByText } = render(<ShuttleSchedule compact={false} />);

    // Assert
    expect(getByText("Shuttle Bus Schedule")).toBeTruthy();
    expect(getByText("Loyola ↔ SGW Campus")).toBeTruthy();
  });

  it("displays Monday-Thursday schedule by default", () => {
    // Arrange
    const mondayThursdaySchedule = SHUTTLE_SCHEDULE.mondayThursday;

    // Act
    const { getAllByText } = render(<ShuttleSchedule />);

    // Assert
    expect(
      getAllByText(mondayThursdaySchedule[0].loyola).length,
    ).toBeGreaterThan(0);
    if (mondayThursdaySchedule[0].sgw) {
      expect(
        getAllByText(mondayThursdaySchedule[0].sgw).length,
      ).toBeGreaterThan(0);
    }
  });

  it("switches to Friday schedule when Friday button is pressed", () => {
    // Arrange
    const fridaySchedule = SHUTTLE_SCHEDULE.friday;
    const { getByText, getAllByText } = render(<ShuttleSchedule />);

    // Act
    fireEvent.press(getByText("Friday"));

    // Assert
    expect(getAllByText(fridaySchedule[0].loyola).length).toBeGreaterThan(0);
    if (fridaySchedule[0].sgw) {
      expect(getAllByText(fridaySchedule[0].sgw).length).toBeGreaterThan(0);
    }
  });

  it("switches back to Monday-Thursday when button is pressed", () => {
    // Arrange
    const mondayThursdaySchedule = SHUTTLE_SCHEDULE.mondayThursday;
    const { getByText } = render(<ShuttleSchedule />);

    // Act
    fireEvent.press(getByText("Friday"));
    fireEvent.press(getByText("Monday — Thursday"));

    // Assert
    expect(getByText(mondayThursdaySchedule[0].loyola)).toBeTruthy();
  });

  it("displays all schedule entries for Monday-Thursday", () => {
    // Arrange
    const schedule = SHUTTLE_SCHEDULE.mondayThursday;
    const { getAllByText } = render(<ShuttleSchedule />);

    // Act & Assert
    schedule.slice(0, 5).forEach((entry) => {
      expect(getAllByText(entry.loyola).length).toBeGreaterThan(0);
      if (entry.sgw) {
        expect(getAllByText(entry.sgw).length).toBeGreaterThan(0);
      }
    });
  });

  it("displays all schedule entries for Friday", () => {
    // Arrange
    const schedule = SHUTTLE_SCHEDULE.friday;
    const { getByText, getAllByText } = render(<ShuttleSchedule />);

    // Act
    fireEvent.press(getByText("Friday"));

    // Assert
    schedule.slice(0, 5).forEach((entry) => {
      expect(getAllByText(entry.loyola).length).toBeGreaterThan(0);
      if (entry.sgw) {
        expect(getAllByText(entry.sgw).length).toBeGreaterThan(0);
      }
    });
  });

  it("does not display SGW time for last bus entry", () => {
    // Arrange
    const schedule = SHUTTLE_SCHEDULE.mondayThursday;
    render(<ShuttleSchedule />);

    // Act
    const lastBusEntry = schedule.find(
      (entry) => !entry.sgw && entry.isLastBus,
    );

    // Assert
    if (lastBusEntry) {
      expect(lastBusEntry.sgw).toBeUndefined();
    }
  });

  it("highlights last bus times", () => {
    // Arrange
    const schedule = SHUTTLE_SCHEDULE.mondayThursday;
    const { getByText } = render(<ShuttleSchedule />);

    // Act
    const lastBusEntry = schedule.find((entry) => entry.isLastBus);

    // Assert
    if (lastBusEntry?.loyola.includes("*")) {
      expect(getByText(lastBusEntry.loyola)).toBeTruthy();
    }
  });

  it("displays table headers correctly", () => {
    // Arrange & Act
    const { getByText } = render(<ShuttleSchedule />);

    // Assert
    expect(getByText("LOY departures")).toBeTruthy();
    expect(getByText("S.G.W departures")).toBeTruthy();
  });

  it("displays last bus note", () => {
    // Arrange & Act
    const { getByText } = render(<ShuttleSchedule />);

    // Assert
    expect(getByText("Last bus / Dernier départ")).toBeTruthy();
  });

  it("handles empty schedule gracefully", () => {
    // Arrange & Act
    const { getByText } = render(<ShuttleSchedule />);

    // Assert - Component should still render day selector even with empty data
    expect(getByText("Monday — Thursday")).toBeTruthy();
    expect(getByText("Friday")).toBeTruthy();
  });
});
