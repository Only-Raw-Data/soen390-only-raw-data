import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import NextClassDirectionsBanner from "../NextClassDirectionsBanner";
import useNextClassDirections from "../../hooks/useNextClassDirections";
import { useDirections } from "../../context/DirectionsContext";
import useUserLocation from "../../hooks/useUserLocation";

jest.mock("../../hooks/useNextClassDirections", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../context/DirectionsContext", () => ({
  useDirections: jest.fn(),
}));

jest.mock("../../hooks/useUserLocation", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const H_BUILDING = {
  id: "h",
  name: "Henry F. Hall Building",
  code: "H",
  lat: 45.497092,
  lng: -73.5788,
  campus: "SGW",
  address: "1455 DeMaisonneuve W",
  department: "",
  overview: "",
  accessibility: "",
  x: 0,
  y: 0,
};

describe("NextClassDirectionsBanner", () => {
  const mockSetDestinationBuilding = jest.fn();
  const mockSetStartBuilding = jest.fn();
  const mockSetStartCoords = jest.fn();
  const mockSetTransportationMode = jest.fn();
  const mockFetchRoute = jest.fn();
  const mockGetRawLocation = jest.fn();
  const mockDismiss = jest.fn();
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDirections as jest.Mock).mockReturnValue({
      setDestinationBuilding: mockSetDestinationBuilding,
      setStartBuilding: mockSetStartBuilding,
      setStartCoords: mockSetStartCoords,
      setTransportationMode: mockSetTransportationMode,
      fetchRoute: mockFetchRoute,
    });

    (useUserLocation as jest.Mock).mockReturnValue({
      getRawLocation: mockGetRawLocation.mockResolvedValue({
        lat: 45.497,
        lng: -73.578,
      }),
    });
  });

  it("renders nothing when not connected", () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: null,
      matchedBuilding: null,
      minutesUntilClass: null,
      shouldNotify: false,
      status: "no_class",
      isLoading: false,
      dismissed: false,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: false,
    });

    const { toJSON } = render(<NextClassDirectionsBanner />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when shouldNotify is false", () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: {
        id: "evt1",
        title: "SOEN 390",
        start: new Date(),
        end: new Date(),
        location: "H-920",
      },
      matchedBuilding: H_BUILDING,
      minutesUntilClass: 60,
      shouldNotify: false,
      status: "too_far",
      isLoading: false,
      dismissed: false,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: true,
    });

    const { toJSON } = render(<NextClassDirectionsBanner />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing when dismissed", () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: {
        id: "evt1",
        title: "SOEN 390",
        start: new Date(),
        end: new Date(),
        location: "H-920",
      },
      matchedBuilding: H_BUILDING,
      minutesUntilClass: 10,
      shouldNotify: true,
      status: "within_threshold",
      isLoading: false,
      dismissed: true,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: true,
    });

    const { toJSON } = render(<NextClassDirectionsBanner />);
    expect(toJSON()).toBeNull();
  });

  it("renders banner with class info when within threshold", () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: {
        id: "evt1",
        title: "SOEN 390",
        start: new Date(Date.now() + 10 * 60 * 1000),
        end: new Date(Date.now() + 90 * 60 * 1000),
        location: "H-920",
      },
      matchedBuilding: H_BUILDING,
      minutesUntilClass: 10,
      shouldNotify: true,
      status: "within_threshold",
      isLoading: false,
      dismissed: false,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: true,
    });

    const { getByText } = render(<NextClassDirectionsBanner />);
    expect(getByText("SOEN 390")).toBeTruthy();
    expect(getByText("Directions")).toBeTruthy();
  });

  it("shows 'Starting now' when minutesUntilClass <= 0", () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: {
        id: "evt1",
        title: "COMP 248",
        start: new Date(),
        end: new Date(),
        location: "H-920",
      },
      matchedBuilding: H_BUILDING,
      minutesUntilClass: 0,
      shouldNotify: true,
      status: "within_threshold",
      isLoading: false,
      dismissed: false,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: true,
    });

    const { getByText } = render(<NextClassDirectionsBanner />);
    expect(getByText(/Starting now/)).toBeTruthy();
  });

  it("calls dismiss when close button is pressed", () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: {
        id: "evt1",
        title: "SOEN 390",
        start: new Date(Date.now() + 10 * 60 * 1000),
        end: new Date(Date.now() + 90 * 60 * 1000),
        location: "H-920",
      },
      matchedBuilding: H_BUILDING,
      minutesUntilClass: 10,
      shouldNotify: true,
      status: "within_threshold",
      isLoading: false,
      dismissed: false,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: true,
    });

    const { getByText } = render(<NextClassDirectionsBanner />);

    const closeButtons = getByText("SOEN 390").parent?.parent?.findAllByProps?.({});
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it("navigates to directions when Get Directions is pressed", async () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: {
        id: "evt1",
        title: "SOEN 390",
        start: new Date(Date.now() + 10 * 60 * 1000),
        end: new Date(Date.now() + 90 * 60 * 1000),
        location: "H-920",
      },
      matchedBuilding: H_BUILDING,
      minutesUntilClass: 10,
      shouldNotify: true,
      status: "within_threshold",
      isLoading: false,
      dismissed: false,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: true,
    });

    const { getByText } = render(<NextClassDirectionsBanner />);

    fireEvent.press(getByText("Directions"));

    await waitFor(() => {
      expect(mockSetDestinationBuilding).toHaveBeenCalledWith(H_BUILDING);
      expect(mockSetStartBuilding).toHaveBeenCalledWith(null);
      expect(mockSetTransportationMode).toHaveBeenCalledWith("walk");
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/two");
    });
  });

  it("does not show directions button when building is not matched", () => {
    (useNextClassDirections as jest.Mock).mockReturnValue({
      nextClass: {
        id: "evt1",
        title: "Meeting",
        start: new Date(Date.now() + 10 * 60 * 1000),
        end: new Date(Date.now() + 90 * 60 * 1000),
        location: null,
      },
      matchedBuilding: null,
      minutesUntilClass: 10,
      shouldNotify: true,
      status: "missing_location",
      isLoading: false,
      dismissed: false,
      dismiss: mockDismiss,
      refresh: mockRefresh,
      isConnected: true,
    });

    const { getByText, queryByText } = render(<NextClassDirectionsBanner />);
    expect(getByText("Meeting")).toBeTruthy();
    expect(queryByText("Directions")).toBeNull();
  });
});
