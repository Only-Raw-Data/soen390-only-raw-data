import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import * as expoRouter from "expo-router";
import Header from "../Header";

describe("Header", () => {
  it("navigates to /moderator on long press of the title", () => {
    const mockPush = jest.fn();
    jest.mocked(expoRouter.useRouter).mockReturnValue({
      push: mockPush,
    } as unknown as ReturnType<typeof expoRouter.useRouter>);

    render(<Header />);

    fireEvent(screen.getByLabelText("Concordia Campus Guide"), "longPress");

    expect(mockPush).toHaveBeenCalledWith("/moderator");
  });
});
