import React from "react";
import Root from "../+html";

jest.mock("expo-router/html", () => ({
  ScrollViewStyleReset: () => null,
}));

describe("+html Root", () => {
  it("returns JSX for the web HTML shell with children", () => {
    const el = Root({ children: React.createElement(React.Fragment, null) });
    expect(el).not.toBeNull();
  });

  it("returns JSX for the web HTML shell without children", () => {
    const el = Root({ children: null as unknown as React.ReactNode });
    expect(el).not.toBeNull();
  });
});
