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
import { useDirections } from "./DirectionsContext";

const COOLDOWN_MS = 3000;

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

  // Cooldown state — true when requests are being throttled
  isOnCooldown: boolean;

  // Actions
  setShowPOIs: (show: boolean) => void;
  setSelectedPOI: (poi: PointOfInterest | null) => void;
  /**
   * Trigger a POI fetch at the given coordinates.
   * @param force - bypass cooldown (use for intentional user actions like campus switch)
   */
  fetchPOIsAt: (lat: number, lon: number, force?: boolean) => void;
  setSearchRadius: (radius: number) => void;
  clearPOIs: () => void;
}

const POIContext = createContext<POIContextType | undefined>(undefined);

interface POIProviderProps {
  readonly children: React.ReactNode;
}

export function POIProvider({ children }: POIProviderProps) {
  const [showPOIs, setShowPOIs] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);
  const [searchCenter, setSearchCenter] = useState({ lat: 45.4972, lon: -73.5792 });
  const [searchRadius, setSearchRadius] = useState(1000);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { route } = useDirections();

  const {
    pois,
    loading: isLoading,
    error,
  } = usePOIs({
    lat: searchCenter.lat,
    lon: searchCenter.lon,
    radius: searchRadius,
    limit: 50,
    enabled: showPOIs && !route,
  });

  /**
   * Fetch POIs at a specific location.
   * - force=false (default): subject to COOLDOWN_MS throttle — use for toggle button presses
   * - force=true: bypasses throttle — use for intentional location changes (campus switch, tab focus)
   */
  const fetchPOIsAt = useCallback((lat: number, lon: number, force = false) => {
    const now = Date.now();
    const elapsed = now - lastFetchTimeRef.current;
    const remaining = COOLDOWN_MS - elapsed;

    if (!force && remaining > 0) {
      // Too soon — signal cooldown to UI without triggering a fetch
      setIsOnCooldown(true);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => setIsOnCooldown(false), remaining);
      return;
    }

    lastFetchTimeRef.current = now;
    setIsOnCooldown(false);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    setSearchCenter({ lat, lon });
  }, []);

  const clearPOIs = useCallback(() => {
    setSelectedPOI(null);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const value = useMemo<POIContextType>(
    () => ({
      showPOIs,
      selectedPOI,
      pois,
      isLoading,
      error,
      searchCenter,
      searchRadius,
      isOnCooldown,
      setShowPOIs,
      setSelectedPOI,
      fetchPOIsAt,
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
      isOnCooldown,
      fetchPOIsAt,
      clearPOIs,
    ],
  );

  return <POIContext.Provider value={value}>{children}</POIContext.Provider>;
}

export function usePOIContext() {
  const context = useContext(POIContext);
  if (!context) {
    throw new Error("usePOIContext must be used within POIProvider");
  }
  return context;
}
