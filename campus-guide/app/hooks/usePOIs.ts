import { useState, useEffect } from "react";
import { PointOfInterest } from "../types/poi";
import { fetchPOIs } from "../services/poiService";
import { POI_LIMIT, POI_RADIUS } from "../../constants/poi";

interface UsePOIsProps {
  lat?: number;
  lon?: number;
  radius?: number; // Search radius in meters
  limit?: number; // Maximum number of POIs to return
  enabled?: boolean; // Whether to fetch data or not
}

export default function usePOIs({
  lat,
  lon,
  radius = POI_RADIUS,
  limit = POI_LIMIT,
  enabled = true,
}: UsePOIsProps) {
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPOIs() {
      // Don't fetch if not enabled; clear stale results so old POIs don't flash on next toggle
      if (!enabled) {
        if (!cancelled) setPois([]);
        return;
      }

      // Clear list only if coordinates are missing
      if (lat === undefined || lon === undefined) {
        if (!cancelled) setPois([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetched = await fetchPOIs(lat, lon, radius, limit);
        if (!cancelled) {
          setPois(fetched);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch POIs"));
          setLoading(false);
        }
      }
    }

    loadPOIs();

    return () => {
      cancelled = true;
    };
  }, [lat, lon, radius, limit, enabled]);

  return { pois, loading, error };
}
