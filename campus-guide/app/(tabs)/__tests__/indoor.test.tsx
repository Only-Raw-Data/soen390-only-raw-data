import React from "react";
import { render, screen } from "@testing-library/react-native";
import IndoorScreen from "../indoor";

jest.mock("@app/components/Header", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function HeaderStub() {
    return <Text testID="header-stub">HeaderStub</Text>;
  };
});
jest.mock("@app/components/IndoorMapView", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function IndoorStub() {
    return <Text testID="indoor-stub">IndoorStub</Text>;
  };
});
jest.mock("@hooks/useScreenTimer", () => ({
  useScreenTimer: jest.fn(),
}));

describe("IndoorScreen", () => {
  it("renders header and indoor map inside the error boundary", () => {
    render(<IndoorScreen />);
    expect(screen.getByTestId("header-stub")).toBeTruthy();
    expect(screen.getByTestId("indoor-stub")).toBeTruthy();
  });
});
