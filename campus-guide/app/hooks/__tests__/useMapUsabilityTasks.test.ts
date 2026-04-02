import { renderHook } from "@testing-library/react-native";
import { SGW_BUILDINGS } from "@/constants/buildings";
import { useMapUsabilityTasks } from "../useMapUsabilityTasks";

const taskSessions: Record<
  string,
  { completeTask: jest.Mock; beginTask: jest.Mock }
> = {};

jest.mock("@hooks/useTaskSession", () => ({
  useTaskSession: jest.fn((taskId: string) => {
    taskSessions[taskId] = {
      completeTask: jest.fn(),
      beginTask: jest.fn(),
    };
    return {
      ...taskSessions[taskId],
      failTask: jest.fn(),
    };
  }),
}));

jest.mock("@context/ParticipantSessionContext", () => ({
  ParticipantSessionProvider: ({ children }: { children: unknown }) => children,
  useParticipantSession: jest.fn(() => ({
    participantId: "t",
    taskSet: "",
    isHydrated: true,
    startSession: jest.fn(() => Promise.resolve()),
  })),
}));

describe("useMapUsabilityTasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(taskSessions).forEach((k) => delete taskSessions[k]);
  });

  it("does not complete tasks when disabled", () => {
    renderHook(() => useMapUsabilityTasks(false, "SGW", null));
    expect(
      taskSessions.toggle_loyola_campus.completeTask,
    ).not.toHaveBeenCalled();
    expect(
      taskSessions.select_building_info.completeTask,
    ).not.toHaveBeenCalled();
  });

  it("completes Loyola task when enabled and campus is Loyola", () => {
    renderHook(() =>
      useMapUsabilityTasks(true, "Loyola", null),
    );
    expect(
      taskSessions.toggle_loyola_campus.completeTask,
    ).toHaveBeenCalledWith(true, "loyola_campus_activated");
  });

  it("completes building info task when a building is selected", () => {
    renderHook(() => useMapUsabilityTasks(true, "SGW", SGW_BUILDINGS[0]));
    expect(
      taskSessions.select_building_info.completeTask,
    ).toHaveBeenCalledWith(true, "building_info_panel_displayed");
  });
});
