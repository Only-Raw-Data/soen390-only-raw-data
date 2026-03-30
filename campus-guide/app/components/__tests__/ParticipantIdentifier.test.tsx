import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";
import { ParticipantSessionProvider } from "@context/ParticipantSessionContext";
import ParticipantIdentifier from "@app/components/ParticipantIdentifier";

beforeEach(async () => {
  await AsyncStorage.clear();
  (jest.mocked(usePostHog)().identify as jest.Mock).mockClear();
});

describe("ParticipantIdentifier", () => {
  it("opens the modal when hydrated with no participant and closes after Start Session", async () => {
    render(
      <ParticipantSessionProvider>
        <ParticipantIdentifier>
          <Text testID="child">App</Text>
        </ParticipantIdentifier>
      </ParticipantSessionProvider>,
    );

    expect(screen.getByTestId("child")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Usability Test")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText("e.g. P01"), "P07");
    fireEvent.press(screen.getByText("Start Session"));

    await waitFor(() => {
      expect(screen.queryByText("Usability Test")).toBeNull();
    });

    expect(jest.mocked(usePostHog)().identify).toHaveBeenCalled();
    expect(await AsyncStorage.getItem("posthog_participant_id")).toBe("P07");
  });

  it("does not show the modal when a participant is already stored", async () => {
    await AsyncStorage.setItem("posthog_participant_id", "P01");
    await AsyncStorage.setItem("posthog_task_set", "");

    render(
      <ParticipantSessionProvider>
        <ParticipantIdentifier>
          <Text>App</Text>
        </ParticipantIdentifier>
      </ParticipantSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Usability Test")).toBeNull();
    });
  });
});
