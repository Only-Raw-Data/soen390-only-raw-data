import React from "react";
import { render, screen } from "@testing-library/react-native";
import NotFoundScreen from "../+not-found";

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
  useRouter: jest.fn(),
}));

jest.mock("@/components/Themed", () => {
  const { Text, View } = require("react-native");
  return { Text, View };
});

describe("NotFoundScreen", () => {
  it("renders the not-found message", () => {
    render(<NotFoundScreen />);
    expect(screen.getByText("This screen doesn't exist.")).toBeTruthy();
  });

  it("renders a link back to the home screen", () => {
    render(<NotFoundScreen />);
    expect(screen.getByText("Go to home screen!")).toBeTruthy();
  });
});
