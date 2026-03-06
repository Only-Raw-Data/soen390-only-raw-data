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
  startCoords: { lat: number; lng: number } | null;
  transportationMode: TransportationMode;
  route: RouteData | null;
  isLoadingRoute: boolean;
  setStartBuilding: (building: Building | null) => void;
  setDestinationBuilding: (building: Building | null) => void;
  setStartCoords: (coords: { lat: number; lng: number } | null) => void;
  setTransportationMode: (mode: TransportationMode) => void;
  clearDirections: () => void;
  swapLocations: () => void;
  fetchRoute: () => Promise<void>;
}

const DirectionsContext = createContext<DirectionsContextType | undefined>(undefined);

export default function DirectionsProvider({ children }: { readonly children: ReactNode }) {
  const [startBuilding, setStartBuilding] = useState<Building | null>(null);
  const [destinationBuilding, setDestinationBuilding] = useState<Building | null>(null);
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [transportationMode, setTransportationMode] = useState<TransportationMode>("walk");
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const activeRequestRef = React.useRef(0);

  const clearDirections = useCallback(() => {
    activeRequestRef.current++;
    setStartBuilding(null);
    setDestinationBuilding(null);
    setStartCoords(null);
    setTransportationMode("walk");
    setRoute(null);
    setIsLoadingRoute(false);
  }, []);

  const swapLocations = useCallback(() => {
    setStartBuilding(destinationBuilding);
    setDestinationBuilding(startBuilding);
    setStartCoords(null);
    setRoute(null);
  }, [startBuilding, destinationBuilding]);

  const fetchRoute = useCallback(async () => {
    if ((!startBuilding && !startCoords) || !destinationBuilding) return;

    const origin = startCoords ?? { lat: startBuilding!.lat, lng: startBuilding!.lng };

    const requestId = ++activeRequestRef.current;
    setIsLoadingRoute(true);

    try {
      const data = await fetchDirections(
        origin,
        { lat: destinationBuilding.lat, lng: destinationBuilding.lng },
        transportationMode,
        {
          startCampus: startBuilding?.campus,
          destinationCampus: destinationBuilding.campus,
        },
      );

      if (requestId === activeRequestRef.current) {
        if (data && destinationBuilding) {
          setRoute(data);
        } else {
          setRoute(null);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch route #${requestId}:`, error);
      if (requestId === activeRequestRef.current) {
        setRoute(null);
      }
    } finally {
      if (requestId === activeRequestRef.current) {
        setIsLoadingRoute(false);
      }
    }
  }, [startBuilding, startCoords, destinationBuilding, transportationMode]);

  const value = useMemo(
    () => ({
      startBuilding,
      destinationBuilding,
      startCoords,
      transportationMode,
      route,
      isLoadingRoute,
      setStartBuilding,
      setDestinationBuilding,
      setStartCoords,
      setTransportationMode,
      clearDirections,
      swapLocations,
      fetchRoute,
    }),
    [
      startBuilding,
      destinationBuilding,
      startCoords,
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