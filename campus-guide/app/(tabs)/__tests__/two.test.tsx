import React from "react";
import { render, screen } from "@testing-library/react-native";
import TabTwoScreen from "../two";

jest.mock("@app/components/Header", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function HeaderStub() {
    return <Text testID="header-stub">HeaderStub</Text>;
  };
});
jest.mock("@app/components/DirectionsHeader", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function DirectionsStub() {
    return <Text testID="directions-stub">DirectionsStub</Text>;
  };
});
jest.mock("@app/components/MapView", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MapStub() {
    return <Text testID="map-stub">MapViewStub</Text>;
  };
});
jest.mock("@hooks/useScreenTimer", () => ({
  useScreenTimer: jest.fn(),
}));

describe("TabTwoScreen (Directions tab)", () => {
  it("renders header, directions header, and map without search", () => {
    render(<TabTwoScreen />);
    expect(screen.getByTestId("header-stub")).toBeTruthy();
    expect(screen.getByTestId("directions-stub")).toBeTruthy();
    expect(screen.getByTestId("map-stub")).toBeTruthy();
  });
});
