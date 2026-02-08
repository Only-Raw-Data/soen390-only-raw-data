import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { Building } from "@/constants/buildings";
import { TransportationMode } from "../types/transportation";
import { fetchDirections, RouteData } from "../services/directionsService";

interface DirectionsContextType {
  startBuilding: Building | null;
  destinationBuilding: Building | null;
  transportationMode: TransportationMode;
  route: RouteData | null;
  isLoadingRoute: boolean;
  setStartBuilding: (building: Building | null) => void;
  setDestinationBuilding: (building: Building | null) => void;
  setTransportationMode: (mode: TransportationMode) => void;
  clearDirections: () => void;
  swapLocations: () => void;
  fetchRoute: () => Promise<void>;
}

const DirectionsContext = createContext<DirectionsContextType | undefined>(
  undefined,
);

export default function DirectionsProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [startBuilding, setStartBuilding] = useState<Building | null>(null);
  const [destinationBuilding, setDestinationBuilding] =
    useState<Building | null>(null);
  const [transportationMode, setTransportationMode] =
    useState<TransportationMode>("walk");
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const clearDirections = useCallback(() => {
    setStartBuilding(null);
    setDestinationBuilding(null);
    setTransportationMode("walk");
    setRoute(null);
  }, []);

  const swapLocations = useCallback(() => {
    setStartBuilding(destinationBuilding);
    setDestinationBuilding(startBuilding);
    setRoute(null);
  }, [startBuilding, destinationBuilding]);

  const fetchRoute = useCallback(async () => {
    if (!startBuilding || !destinationBuilding) return;

    setIsLoadingRoute(true);
    try {
      const data = await fetchDirections(
        { lat: startBuilding.lat, lng: startBuilding.lng },
        { lat: destinationBuilding.lat, lng: destinationBuilding.lng },
        transportationMode,
      );
      setRoute(data);
    } catch (error) {
      console.error("Failed to fetch route:", error);
      setRoute(null);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [startBuilding, destinationBuilding, transportationMode]);

  const value = useMemo(
    () => ({
      startBuilding,
      destinationBuilding,
      transportationMode,
      route,
      isLoadingRoute,
      setStartBuilding,
      setDestinationBuilding,
      setTransportationMode,
      clearDirections,
      swapLocations,
      fetchRoute,
    }),
    [
      startBuilding,
      destinationBuilding,
      transportationMode,
      route,
      isLoadingRoute,
      clearDirections,
      swapLocations,
      fetchRoute,
    ],
  );

  return (
    <DirectionsContext.Provider value={value}>
      {children}
    </DirectionsContext.Provider>
  );
}

export function useDirections() {
  const context = useContext(DirectionsContext);
  if (context === undefined) {
    throw new Error("useDirections must be used within a DirectionsProvider");
  }
  return context;
}
