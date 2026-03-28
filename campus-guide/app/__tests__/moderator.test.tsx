import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as expoRouter from "expo-router";
import { ParticipantSessionProvider } from "@context/ParticipantSessionContext";
import ModeratorScreen from "../moderator";

const mockBack = jest.fn();

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.mocked(expoRouter.useRouter).mockReturnValue({
    back: mockBack,
  } as ReturnType<typeof expoRouter.useRouter>);
  mockBack.mockClear();
});

describe("ModeratorScreen", () => {
  it("starts session with trimmed values and navigates back", async () => {
    render(
      <ParticipantSessionProvider>
        <ModeratorScreen />
      </ParticipantSessionProvider>,
    );

    fireEvent.changeText(screen.getByPlaceholderText("e.g. P01"), "  M1  ");
    fireEvent.changeText(
      screen.getByPlaceholderText("e.g. A / pilot / round 2"),
      "  pilot  ",
    );
    fireEvent.press(screen.getByText("Start Session"));

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });

    expect(await AsyncStorage.getItem("posthog_participant_id")).toBe("M1");
    expect(await AsyncStorage.getItem("posthog_task_set")).toBe("pilot");
  });

  it("uses anon id when participant field is empty", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    render(
      <ParticipantSessionProvider>
        <ModeratorScreen />
      </ParticipantSessionProvider>,
    );

    fireEvent.press(screen.getByText("Start Session"));

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });

    expect(await AsyncStorage.getItem("posthog_participant_id")).toBe(
      "anon_1700000000000",
    );

    jest.spyOn(Date, "now").mockRestore();
  });
});
