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

interface DirectionsContextType {
  startBuilding: Building | null;
  destinationBuilding: Building | null;
  transportationMode: TransportationMode;
  setStartBuilding: (building: Building | null) => void;
  setDestinationBuilding: (building: Building | null) => void;
  setTransportationMode: (mode: TransportationMode) => void;
  clearDirections: () => void;
  swapLocations: () => void;
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

  const clearDirections = useCallback(() => {
    setStartBuilding(null);
    setDestinationBuilding(null);
    setTransportationMode("walk");
  }, []);

  const swapLocations = useCallback(() => {
    setStartBuilding(destinationBuilding);
    setDestinationBuilding(startBuilding);
  }, [startBuilding, destinationBuilding]);

  const value = useMemo(
    () => ({
      startBuilding,
      destinationBuilding,
      transportationMode,
      setStartBuilding,
      setDestinationBuilding,
      setTransportationMode,
      clearDirections,
      swapLocations,
    }),
    [
      startBuilding,
      destinationBuilding,
      transportationMode,
      clearDirections,
      swapLocations,
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
