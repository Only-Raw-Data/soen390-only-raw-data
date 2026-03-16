import React from "react";
import { render } from "@testing-library/react-native";
import StoryOutdoorMap from "@/app/components/StoryOutdoorMap";

// Mock mapStyle constant
jest.mock("@/constants/mapStyle", () => ({
  CAMPUS_MAP_STYLE: [],
}));

const makeRoute = (
  coords: { latitude: number; longitude: number }[],
  duration = "6 min",
  distance = "500 m",
) => ({
  coordinates: coords,
  duration,
  distance,
});

const sampleCoords = [
  { latitude: 45.497, longitude: -73.579 },
  { latitude: 45.498, longitude: -73.578 },
  { latitude: 45.499, longitude: -73.577 },
];

describe("StoryOutdoorMap", () => {
  it("renders map, polyline, markers, and info bar for a valid route", () => {
    // Arrange
    const route = makeRoute(sampleCoords, "6 min", "500 m");

    // Act
    const { getByTestId, getByText } = render(
      <StoryOutdoorMap route={route} startLabel="Hall Building" endLabel="MB Building" />,
    );

    // Assert
    expect(getByTestId("story-outdoor-map")).toBeTruthy();
    expect(getByTestId("story-outdoor-polyline")).toBeTruthy();
    expect(getByText("Hall Building")).toBeTruthy();
    expect(getByText("MB Building")).toBeTruthy();
    expect(getByText("Walking: 6 min (500 m)")).toBeTruthy();
  });

  it("renders nothing when coordinates array is empty", () => {
    // Arrange
    const route = makeRoute([]);

    // Act
    const { queryByTestId } = render(
      <StoryOutdoorMap route={route} startLabel="A" endLabel="B" />,
    );

    // Assert
    expect(queryByTestId("story-outdoor-map")).toBeNull();
  });

  it("renders nothing when coordinates is undefined", () => {
    // Arrange
    const route = { duration: "5 min", distance: "400 m" } as any;

    // Act
    const { queryByTestId } = render(
      <StoryOutdoorMap route={route} startLabel="A" endLabel="B" />,
    );

    // Assert
    expect(queryByTestId("story-outdoor-map")).toBeNull();
  });

  it("renders marker titles matching start and end labels", () => {
    // Arrange
    const route = makeRoute(sampleCoords);

    // Act
    const { getByText } = render(
      <StoryOutdoorMap route={route} startLabel="Start Here" endLabel="End Here" />,
    );

    // Assert — mock Marker renders title as text
    expect(getByText("Start Here")).toBeTruthy();
    expect(getByText("End Here")).toBeTruthy();
  });

  it("computes region that covers all coordinates", () => {
    // Arrange
    const route = makeRoute(sampleCoords);

    // Act
    const { getByTestId } = render(
      <StoryOutdoorMap route={route} startLabel="A" endLabel="B" />,
    );

    // Assert — region center should be midpoint of lat/lng bounds
    const map = getByTestId("story-outdoor-map");
    const region = map.props.initialRegion;
    expect(region.latitude).toBeCloseTo((45.497 + 45.499) / 2, 5);
    expect(region.longitude).toBeCloseTo((-73.579 + -73.577) / 2, 5);
    expect(region.latitudeDelta).toBeGreaterThan(0);
    expect(region.longitudeDelta).toBeGreaterThan(0);
  });

  it("enforces minimum delta of 0.003 for small coordinate spans", () => {
    // Arrange — single point, so span is 0
    const route = makeRoute([{ latitude: 45.497, longitude: -73.579 }]);

    // Act
    const { getByTestId } = render(
      <StoryOutdoorMap route={route} startLabel="A" endLabel="B" />,
    );

    // Assert
    const region = getByTestId("story-outdoor-map").props.initialRegion;
    expect(region.latitudeDelta).toBe(0.003);
    expect(region.longitudeDelta).toBe(0.003);
  });

  it("displays correct walking duration and distance", () => {
    // Arrange
    const route = makeRoute(sampleCoords, "12 min", "1.2 km");

    // Act
    const { getByText } = render(
      <StoryOutdoorMap route={route} startLabel="A" endLabel="B" />,
    );

    // Assert
    expect(getByText("Walking: 12 min (1.2 km)")).toBeTruthy();
  });
});
