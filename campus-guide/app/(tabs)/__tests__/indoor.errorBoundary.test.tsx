import React from "react";
import { render, screen } from "@testing-library/react-native";

jest.mock("@app/components/Header", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function HeaderStub() {
    return <Text testID="header-stub">HeaderStub</Text>;
  };
});
jest.mock("@app/components/IndoorMapView", () => {
  return function IndoorMapThatThrows() {
    throw new Error("render boom");
  };
});
jest.mock("@hooks/useScreenTimer", () => ({
  useScreenTimer: jest.fn(),
}));

import IndoorScreen from "../indoor";

describe("IndoorScreen error boundary", () => {
  it("shows fallback UI when IndoorMapView throws during render", () => {
    render(<IndoorScreen />);
    expect(screen.getByText(/Indoor map crashed/i)).toBeTruthy();
    expect(screen.getByText("render boom")).toBeTruthy();
  });
});
