import { renderHook, act } from "@testing-library/react-native";
import { usePostHog } from "posthog-react-native";
import { useTaskSession } from "../useTaskSession";

jest.mock("@context/ParticipantSessionContext", () => ({
  ParticipantSessionProvider: ({ children }: { children: unknown }) => children,
  useParticipantSession: jest.fn(() => ({
    participantId: "p1",
    taskSet: "",
    isHydrated: true,
    startSession: jest.fn(() => Promise.resolve()),
  })),
}));

describe("useTaskSession", () => {
  beforeEach(() => {
    (jest.mocked(usePostHog)().capture as jest.Mock).mockClear();
  });

  it("captures task_started on mount by default", () => {
    renderHook(() => useTaskSession("t1", "Task one"));
    expect(jest.mocked(usePostHog)().capture).toHaveBeenCalledWith(
      "task_started",
      expect.objectContaining({ task_id: "t1", task_name: "Task one" }),
    );
  });

  it("does not begin when disabled", () => {
    renderHook(() =>
      useTaskSession("t2", "Task two", { enabled: false }),
    );
    expect(jest.mocked(usePostHog)().capture).not.toHaveBeenCalled();
  });

  it("waits for manual beginTask when startWhen is manual", () => {
    const { result } = renderHook(() =>
      useTaskSession("t3", "Task three", { startWhen: "manual" }),
    );
    expect(jest.mocked(usePostHog)().capture).not.toHaveBeenCalled();
    act(() => result.current.beginTask());
    expect(jest.mocked(usePostHog)().capture).toHaveBeenCalledWith(
      "task_started",
      expect.objectContaining({ task_id: "t3" }),
    );
  });

  it("failTask completes with success false", () => {
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000);
    const { result } = renderHook(() => useTaskSession("t4", "Task four"));
    act(() => result.current.failTask("oops"));
    expect(jest.mocked(usePostHog)().capture).toHaveBeenCalledWith(
      "task_completed",
      expect.objectContaining({
        task_id: "t4",
        success: false,
        reason: "oops",
      }),
    );
    jest.restoreAllMocks();
  });

  it("ignores completeTask before begin when using manual start", () => {
    const { result } = renderHook(() =>
      useTaskSession("t5", "Task five", { startWhen: "manual" }),
    );
    act(() => result.current.completeTask(true, "early"));
    expect(jest.mocked(usePostHog)().capture).not.toHaveBeenCalledWith(
      "task_completed",
      expect.anything(),
    );
  });
});
