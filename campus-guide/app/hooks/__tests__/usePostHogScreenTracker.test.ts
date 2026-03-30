import { renderHook } from "@testing-library/react-native";
import { usePathname } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { usePostHogScreenTracker } from "../usePostHogScreenTracker";

describe("usePostHogScreenTracker", () => {
  beforeEach(() => {
    jest.mocked(usePostHog)().screen.mockClear();
  });

  it.each([
    ["/", "Map"],
    ["/two", "Directions"],
    ["/indoor", "Indoor Navigation"],
    ["/schedule", "Schedule"],
    ["/poi", "Points of Interest"],
  ] as const)("maps %s to screen %s", (path, label) => {
    jest.mocked(usePathname).mockReturnValue(path);

    renderHook(() => usePostHogScreenTracker());

    expect(jest.mocked(usePostHog)().screen).toHaveBeenCalledWith(label, {
      path,
    });
  });

  it("uses the raw pathname when it is not in the map", () => {
    jest.mocked(usePathname).mockReturnValue("/moderator");

    renderHook(() => usePostHogScreenTracker());

    expect(jest.mocked(usePostHog)().screen).toHaveBeenCalledWith("/moderator", {
      path: "/moderator",
    });
  });
});
