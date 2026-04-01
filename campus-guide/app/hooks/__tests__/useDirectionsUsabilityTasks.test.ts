import { renderHook } from "@testing-library/react-native";
import { useDirections } from "@context/DirectionsContext";
import { useDirectionsUsabilityTasks } from "../useDirectionsUsabilityTasks";

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

jest.mock("@context/DirectionsContext", () => ({
  useDirections: jest.fn(),
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

describe("useDirectionsUsabilityTasks", () => {
  const mockUseDirections = useDirections as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(taskSessions).forEach((k) => delete taskSessions[k]);
  });

  it("completes get-directions task when CTA handler runs", () => {
    mockUseDirections.mockReturnValue({
      route: null,
      transportationMode: "walk",
      startBuilding: null,
      destinationBuilding: null,
    });
    const { result } = renderHook(() => useDirectionsUsabilityTasks());
    result.current.onGetDirectionsCta();
    expect(taskSessions.get_directions.completeTask).toHaveBeenCalledWith(
      true,
      "get_directions_cta_tapped",
    );
  });

  it("begins explore-modes task when a route first appears", () => {
    mockUseDirections.mockReturnValue({
      route: { id: "r1" },
      transportationMode: "walk",
      startBuilding: null,
      destinationBuilding: null,
    });
    renderHook(() => useDirectionsUsabilityTasks());
    expect(taskSessions.explore_transport_modes.beginTask).toHaveBeenCalled();
  });

  it("completes explore-modes task when mode changes after route is shown", () => {
    mockUseDirections.mockReturnValue({
      route: { id: "r1" },
      transportationMode: "walk",
      startBuilding: null,
      destinationBuilding: null,
    });
    const { rerender } = renderHook(() => useDirectionsUsabilityTasks());
    expect(taskSessions.explore_transport_modes.beginTask).toHaveBeenCalled();

    mockUseDirections.mockReturnValue({
      route: { id: "r1" },
      transportationMode: "car",
      startBuilding: null,
      destinationBuilding: null,
    });
    rerender({});
    expect(
      taskSessions.explore_transport_modes.completeTask,
    ).toHaveBeenCalledWith(true, "transport_mode_switched_after_route");
  });

  it("begins T5 when shuttle cross-campus is selected", () => {
    mockUseDirections.mockReturnValue({
      route: null,
      transportationMode: "shuttle",
      startBuilding: { campus: "SGW" },
      destinationBuilding: { campus: "Loyola" },
    });
    renderHook(() => useDirectionsUsabilityTasks());
    expect(taskSessions.T5.beginTask).toHaveBeenCalled();
  });

  it("completes T5 when shuttle cross-campus route is shown", () => {
    mockUseDirections.mockReturnValue({
      route: { id: "shuttle-route" },
      transportationMode: "shuttle",
      startBuilding: { campus: "SGW" },
      destinationBuilding: { campus: "Loyola" },
    });
    renderHook(() => useDirectionsUsabilityTasks());
    expect(taskSessions.T5.completeTask).toHaveBeenCalledWith(
      true,
      "shuttle_cross_campus_route_displayed",
    );
  });
});
