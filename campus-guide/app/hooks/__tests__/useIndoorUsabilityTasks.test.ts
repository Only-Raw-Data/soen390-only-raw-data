import { renderHook } from "@testing-library/react-native";
import { useIndoorMap } from "@context/IndoorMapContext";
import { NodeType } from "@app/services/indoorGraphService";
import type { GraphNode } from "@app/services/indoorGraphService";
import {
  pathTouchesUpperFloor,
  useIndoorUsabilityTasks,
} from "../useIndoorUsabilityTasks";

const node = (id: string, floor: number): GraphNode => ({
  id,
  lat: 0,
  lng: 0,
  floor,
  type: NodeType.Waypoint,
});

const taskSessions: Record<
  string,
  { completeTask: jest.Mock; beginTask: jest.Mock }
> = {};

jest.mock("@hooks/useTaskSession", () => ({
  useTaskSession: jest.fn((taskId: string) => {
    if (!taskSessions[taskId]) {
      taskSessions[taskId] = {
        completeTask: jest.fn(),
        beginTask: jest.fn(),
      };
    }
    return {
      ...taskSessions[taskId],
      failTask: jest.fn(),
    };
  }),
}));

jest.mock("@context/IndoorMapContext", () => ({
  useIndoorMap: jest.fn(),
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

describe("pathTouchesUpperFloor", () => {
  it("returns false for empty path", () => {
    expect(pathTouchesUpperFloor([])).toBe(false);
  });

  it("returns false when all floors are below 2 and single level", () => {
    expect(pathTouchesUpperFloor([node("a", 1)])).toBe(false);
    expect(pathTouchesUpperFloor([node("a", 1), node("b", 1)])).toBe(false);
  });

  it("returns true when max floor is at least 2", () => {
    expect(pathTouchesUpperFloor([node("a", 2)])).toBe(true);
    expect(pathTouchesUpperFloor([node("a", 1), node("b", 3)])).toBe(true);
  });

  it("returns true when path spans more than one floor (even if max < 2)", () => {
    expect(pathTouchesUpperFloor([node("a", 0), node("b", 1)])).toBe(true);
  });
});

describe("useIndoorUsabilityTasks", () => {
  const mockUseIndoorMap = useIndoorMap as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(taskSessions).forEach((k) => delete taskSessions[k]);
  });

  it("does not complete tasks when cross-building", () => {
    mockUseIndoorMap.mockReturnValue({
      currentPath: [node("a", 1)],
      accessible: false,
      isCrossBuilding: true,
    });
    renderHook(() => useIndoorUsabilityTasks());
    expect(taskSessions.T6.completeTask).not.toHaveBeenCalled();
    expect(taskSessions.T7.completeTask).not.toHaveBeenCalled();
  });

  it("does not complete tasks when path is empty", () => {
    mockUseIndoorMap.mockReturnValue({
      currentPath: [],
      accessible: false,
      isCrossBuilding: false,
    });
    renderHook(() => useIndoorUsabilityTasks());
    expect(taskSessions.T6.completeTask).not.toHaveBeenCalled();
    expect(taskSessions.T7.completeTask).not.toHaveBeenCalled();
  });

  it("does not complete tasks when currentPath is null", () => {
    mockUseIndoorMap.mockReturnValue({
      currentPath: null,
      accessible: false,
      isCrossBuilding: false,
    });
    renderHook(() => useIndoorUsabilityTasks());
    expect(taskSessions.T6.completeTask).not.toHaveBeenCalled();
    expect(taskSessions.T7.completeTask).not.toHaveBeenCalled();
  });

  it("completes T6 when not accessible and path is non-empty", () => {
    mockUseIndoorMap.mockReturnValue({
      currentPath: [node("a", 1)],
      accessible: false,
      isCrossBuilding: false,
    });
    renderHook(() => useIndoorUsabilityTasks());
    expect(taskSessions.T6.completeTask).toHaveBeenCalledWith(
      true,
      "indoor_shortest_path_displayed",
    );
    expect(taskSessions.T7.completeTask).not.toHaveBeenCalled();
  });

  it("completes T7 when accessible and path touches upper floor", () => {
    mockUseIndoorMap.mockReturnValue({
      currentPath: [node("a", 1), node("b", 2)],
      accessible: true,
      isCrossBuilding: false,
    });
    renderHook(() => useIndoorUsabilityTasks());
    expect(taskSessions.T6.completeTask).not.toHaveBeenCalled();
    expect(taskSessions.T7.completeTask).toHaveBeenCalledWith(
      true,
      "indoor_accessible_upper_floor_path_displayed",
    );
  });

  it("does not complete T7 when accessible but path stays on lower floors", () => {
    mockUseIndoorMap.mockReturnValue({
      currentPath: [node("a", 1), node("b", 1)],
      accessible: true,
      isCrossBuilding: false,
    });
    renderHook(() => useIndoorUsabilityTasks());
    expect(taskSessions.T6.completeTask).not.toHaveBeenCalled();
    expect(taskSessions.T7.completeTask).not.toHaveBeenCalled();
  });

  it("completes T6 only once when deps update", () => {
    mockUseIndoorMap.mockReturnValue({
      currentPath: [node("a", 1)],
      accessible: false,
      isCrossBuilding: false,
    });
    const { rerender } = renderHook(() => useIndoorUsabilityTasks());
    expect(taskSessions.T6.completeTask).toHaveBeenCalledTimes(1);
    mockUseIndoorMap.mockReturnValue({
      currentPath: [node("a", 1), node("b", 1)],
      accessible: false,
      isCrossBuilding: false,
    });
    rerender({});
    expect(taskSessions.T6.completeTask).toHaveBeenCalledTimes(1);
  });
});
