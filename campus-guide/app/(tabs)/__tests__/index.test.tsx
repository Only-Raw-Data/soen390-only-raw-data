import React from "react";
import { render, screen } from "@testing-library/react-native";
import TabOneScreen from "../index";

jest.mock("@app/components/Header", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function HeaderStub() {
    return <Text testID="header-stub">HeaderStub</Text>;
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

describe("TabOneScreen (Map tab)", () => {
  it("renders header, map stub, and enables usability tracking", () => {
    render(<TabOneScreen />);
    expect(screen.getByTestId("header-stub")).toBeTruthy();
    expect(screen.getByTestId("map-stub")).toBeTruthy();
    expect(screen.getByText("MapViewStub")).toBeTruthy();
  });
});
