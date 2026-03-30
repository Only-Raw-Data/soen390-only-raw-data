import { renderHook, act } from "@testing-library/react-native";
import { usePostHog } from "posthog-react-native";
import { useActionRepeatSignal } from "../useActionRepeatSignal";

describe("useActionRepeatSignal", () => {
  beforeEach(() => {
    jest.mocked(usePostHog)().capture.mockClear();
  });

  it("does not capture on first occurrence within a window", () => {
    const { result } = renderHook(() => useActionRepeatSignal(10_000));
    act(() => result.current("tap_search"));
    expect(jest.mocked(usePostHog)().capture).not.toHaveBeenCalled();
  });

  it("captures action_repeated when the same action repeats inside the window", () => {
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000);

    const { result } = renderHook(() => useActionRepeatSignal(10_000));
    act(() => result.current("tap_search"));
    act(() => result.current("tap_search"));
    act(() => result.current("tap_search"));

    expect(jest.mocked(usePostHog)().capture).toHaveBeenLastCalledWith(
      "action_repeated",
      expect.objectContaining({ action: "tap_search", count: 3 }),
    );

    jest.restoreAllMocks();
  });

  it("resets the window after windowMs elapses", () => {
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(20_000)
      .mockReturnValueOnce(20_001);

    const { result } = renderHook(() => useActionRepeatSignal(10_000));
    act(() => result.current("x"));
    act(() => result.current("x"));
    expect(jest.mocked(usePostHog)().capture).not.toHaveBeenCalled();
    act(() => result.current("x"));
    expect(jest.mocked(usePostHog)().capture).toHaveBeenCalledTimes(1);

    jest.restoreAllMocks();
  });
});
