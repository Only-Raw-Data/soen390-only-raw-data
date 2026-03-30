import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";
import {
  ParticipantSessionProvider,
  useParticipantSession,
} from "@context/ParticipantSessionContext";

beforeEach(async () => {
  await AsyncStorage.clear();
  (jest.mocked(usePostHog)().identify as jest.Mock).mockClear();
});

function HydrationProbe() {
  const { participantId, isHydrated, taskSet } = useParticipantSession();
  return (
    <Text testID="probe">
      {isHydrated ? `${participantId ?? "null"}|${taskSet}` : "loading"}
    </Text>
  );
}

function BadConsumer() {
  useParticipantSession();
  return null;
}

describe("ParticipantSessionContext", () => {
  it("throws when useParticipantSession is used outside the provider", () => {
    expect(() => render(<BadConsumer />)).toThrow(
      /useParticipantSession must be used within ParticipantSessionProvider/,
    );
  });

  it("hydrates with no saved session", async () => {
    render(
      <ParticipantSessionProvider>
        <HydrationProbe />
      </ParticipantSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("probe").props.children).toBe("null|");
    });
    expect(jest.mocked(usePostHog)().identify).not.toHaveBeenCalled();
  });

  it("hydrates from AsyncStorage and identifies in PostHog", async () => {
    await AsyncStorage.setItem("posthog_participant_id", "P42");
    await AsyncStorage.setItem("posthog_task_set", "round1");

    render(
      <ParticipantSessionProvider>
        <HydrationProbe />
      </ParticipantSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("probe").props.children).toBe("P42|round1");
    });
    expect(jest.mocked(usePostHog)().identify).toHaveBeenCalledWith(
      "participant_P42",
      expect.objectContaining({
        participant_id: "P42",
        task_set: "round1",
      }),
    );
  });

  it("startSession persists, updates state, and identifies", async () => {
    function Starter() {
      const { startSession, participantId, isHydrated } = useParticipantSession();
      return (
        <>
          <Text testID="pid">{isHydrated ? participantId ?? "null" : "loading"}</Text>
          <Pressable
            testID="start"
            onPress={() => void startSession("  P99  ", "  setB  ")}
          >
            <Text>Go</Text>
          </Pressable>
        </>
      );
    }

    render(
      <ParticipantSessionProvider>
        <Starter />
      </ParticipantSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("pid").props.children).not.toBe("loading");
    });

    fireEvent.press(screen.getByTestId("start"));

    await waitFor(() => {
      expect(screen.getByTestId("pid").props.children).toBe("P99");
    });

    expect(await AsyncStorage.getItem("posthog_participant_id")).toBe("P99");
    expect(await AsyncStorage.getItem("posthog_task_set")).toBe("setB");
    expect(jest.mocked(usePostHog)().identify).toHaveBeenCalledWith(
      "participant_P99",
      expect.objectContaining({
        participant_id: "P99",
        task_set: "setB",
        session_date: expect.any(String),
      }),
    );
  });
});
