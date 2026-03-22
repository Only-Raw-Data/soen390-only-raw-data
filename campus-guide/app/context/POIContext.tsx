import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { PointOfInterest } from "../types/poi";
import usePOIs from "../hooks/usePOIs";
import { MAP_CONSTANTS } from "@/constants/map";

interface POIContextType {
  // Visibility & selection
  showPOIs: boolean;
  selectedPOI: PointOfInterest | null;

  // Data
  pois: PointOfInterest[];
  isLoading: boolean;
  error: Error | null;

  // Search parameters
  searchCenter: { lat: number; lon: number };
  searchRadius: number;

  // Actions
  setShowPOIs: (show: boolean) => void;
  setSelectedPOI: (poi: PointOfInterest | null) => void;
  updateSearchCenter: (lat: number, lon: number) => void;
  setSearchRadius: (radius: number) => void;
  clearPOIs: () => void;
}

const POIContext = createContext<POIContextType | undefined>(undefined);

interface POIProviderProps {
  children: React.ReactNode;
}

/**
 * POIProvider: Centralized POI state management across tabs.
 * - Persists showPOIs, pois, and search parameters across navigation
 * - Implements smart region change logic with debouncing
 * - Provides shared source of truth for both Map and POI tabs
 */
export function POIProvider({ children }: POIProviderProps) {
  // Visibility
  const [showPOIs, setShowPOIs] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);

  // Search parameters
  const [searchCenter, setSearchCenter] = useState({
    lat: 45.4972,
    lon: -73.5792,
  }); // Default: SGW campus
  const [searchRadius, setSearchRadius] = useState(1000); // Default: 1km

  // Debounce region changes to avoid excessive API calls
  const searchCenterRef = useRef(searchCenter);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch POIs through the hook using context's search parameters
  const {
    pois,
    loading: isLoading,
    error,
  } = usePOIs({
    lat: searchCenter.lat,
    lon: searchCenter.lon,
    radius: searchRadius,
    limit: 50,
    enabled: showPOIs,
  });

  /**
   * Smart region change handler:
   * - Only updates search center if moved beyond meaningful threshold
   * - Debounces to prevent API spam
   * - Does NOT automatically disable showPOIs; instead auto-fetches new data
   */
  const updateSearchCenter = useCallback((lat: number, lon: number) => {
    const latDelta = Math.abs(lat - searchCenterRef.current.lat);
    const lonDelta = Math.abs(lon - searchCenterRef.current.lon);

    // Only update if moved beyond threshold
    if (
      latDelta > MAP_CONSTANTS.REGION_UPDATE_THRESHOLD ||
      lonDelta > MAP_CONSTANTS.REGION_UPDATE_THRESHOLD
    ) {
      // Debounce to avoid spam
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        searchCenterRef.current = { lat, lon };
        setSearchCenter({ lat, lon });
      }, 300); // 300ms debounce
    }
  }, []);

  const clearPOIs = useCallback(() => {
    setSelectedPOI(null);
  }, []);

  useEffect(() => {
    // Sync searchCenterRef with searchCenter state
    searchCenterRef.current = searchCenter;
  }, [searchCenter]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const value: POIContextType = useMemo<POIContextType>(
    () => ({
      showPOIs,
      selectedPOI,
      pois,
      isLoading,
      error,
      searchCenter,
      searchRadius,
      setShowPOIs,
      setSelectedPOI,
      updateSearchCenter,
      setSearchRadius,
      clearPOIs,
    }),
    [
      showPOIs,
      selectedPOI,
      pois,
      isLoading,
      error,
      searchCenter,
      searchRadius,
      updateSearchCenter,
      clearPOIs,
    ],
  );

  return <POIContext.Provider value={value}>{children}</POIContext.Provider>;
}

/**
 * Hook to access POI context.
 * Throws if used outside POIProvider.
 */
export function usePOIContext() {
  const context = useContext(POIContext);
  if (!context) {
    throw new Error("usePOIContext must be used within POIProvider");
  }
  return context;
}
