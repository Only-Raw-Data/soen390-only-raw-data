import React from "react";
import { Alert, InteractionManager } from "react-native";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as expoRouter from "expo-router";
import { usePostHog } from "posthog-react-native";
import { ParticipantSessionProvider } from "@context/ParticipantSessionContext";
import ModeratorScreen from "../moderator";

const mockBack = jest.fn();

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.mocked(expoRouter.useRouter).mockReturnValue({
    back: mockBack,
  } as unknown as ReturnType<typeof expoRouter.useRouter>);
  mockBack.mockClear();
  (jest.mocked(usePostHog)().capture as jest.Mock).mockClear();
  (jest.mocked(usePostHog)().ready as jest.Mock).mockClear();
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

  it("captures usability_session_completed with active session context", async () => {
    render(
      <ParticipantSessionProvider>
        <ModeratorScreen />
      </ParticipantSessionProvider>,
    );

    fireEvent.changeText(screen.getByPlaceholderText("e.g. P01"), "P09");
    fireEvent.changeText(
      screen.getByPlaceholderText("e.g. A / pilot / round 2"),
      "roundA",
    );
    fireEvent.press(screen.getByText("Start Session"));

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });

    jest.useFakeTimers();
    (jest.mocked(usePostHog)().capture as jest.Mock).mockClear();

    const ia = jest
      .spyOn(InteractionManager, "runAfterInteractions")
      .mockImplementation(((task?: () => void) => {
        if (typeof task === "function") task();
        return {
          cancel: jest.fn(),
          then: (onF?: () => unknown) => Promise.resolve().then(onF),
          done: jest.fn(),
        };
      }) as typeof InteractionManager.runAfterInteractions);

    try {
      fireEvent.press(screen.getByText("Mark usability session complete"));

      expect(mockBack).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(520);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(jest.mocked(usePostHog)().capture).toHaveBeenCalledWith(
        "usability_session_completed",
        {
          participant_id: "P09",
          task_set: "roundA",
        },
      );
    } finally {
      ia.mockRestore();
      jest.useRealTimers();
    }
  });

  it("shows alert and does not capture when no session exists", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    render(
      <ParticipantSessionProvider>
        <ModeratorScreen />
      </ParticipantSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Mark usability session complete")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Mark usability session complete"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "No active session",
      expect.any(String),
    );
    expect(jest.mocked(usePostHog)().capture).not.toHaveBeenCalledWith(
      "usability_session_completed",
      expect.anything(),
    );
    alertSpy.mockRestore();
  });
});
