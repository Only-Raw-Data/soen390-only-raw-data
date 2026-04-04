import React from "react";
import { Platform } from "react-native";
import { render, screen } from "@testing-library/react-native";
import ModalScreen from "../modal";

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@/components/EditScreenInfo", () => () => null);

jest.mock("@/components/Themed", () => {
  const { Text, View } = require("react-native");
  return { Text, View };
});

describe("ModalScreen", () => {
  it("renders the modal title on non-iOS (auto status bar)", () => {
    Platform.OS = "android";
    render(<ModalScreen />);
    expect(screen.getByText("Modal")).toBeTruthy();
  });

  it("renders the modal title on iOS (light status bar)", () => {
    Platform.OS = "ios";
    render(<ModalScreen />);
    expect(screen.getByText("Modal")).toBeTruthy();
    Platform.OS = "android";
  });
});
