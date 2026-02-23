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

  const activeRequestRef = React.useRef(0);

  const clearDirections = useCallback(() => {
    console.log('Clearing directions state');
    activeRequestRef.current++; // Invalidate any pending requests
    setStartBuilding(null);
    setDestinationBuilding(null);
    setTransportationMode("walk");
    setRoute(null);
    setIsLoadingRoute(false);
  }, []);

  const swapLocations = useCallback(() => {
    console.log('Swapping locations');
    setStartBuilding(destinationBuilding);
    setDestinationBuilding(startBuilding);
    setRoute(null);
  }, [startBuilding, destinationBuilding]);

  const fetchRoute = useCallback(async () => {
    if (!startBuilding || !destinationBuilding) {
      console.log('fetchRoute called but missing buildings:', { start: !!startBuilding, dest: !!destinationBuilding });
      return;
    }

    const requestId = ++activeRequestRef.current;
    console.log(`Starting fetchRoute request #${requestId}`, {
      start: startBuilding.code,
      dest: destinationBuilding.code,
      mode: transportationMode
    });
    
    setIsLoadingRoute(true);
    
    try {
      const data = await fetchDirections(
        { lat: startBuilding.lat, lng: startBuilding.lng },
        { lat: destinationBuilding.lat, lng: destinationBuilding.lng },
        transportationMode,
        {
          startCampus: startBuilding.campus,
          destinationCampus: destinationBuilding.campus,
        },
      );
      
      if (requestId === activeRequestRef.current) {
        if (data && startBuilding && destinationBuilding) {
          console.log(`Successfully fetched route #${requestId}`);
          setRoute(data);
        } else {
          console.log(`Fetch finished for #${requestId} but data or buildings missing, clearing route`);
          setRoute(null);
        }
      } else {
        console.log(`Ignoring stale route response for request #${requestId}`);
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
