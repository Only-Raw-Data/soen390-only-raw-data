import { TransportationMode, SegmentMode } from "@app/types/transportation";

export const SEGMENT_COLORS: Record<SegmentMode, string> = {
  WALK: "#3B82F6",
  BUS: "#16A34A",
  SUBWAY: "#F97316",
  TRAM: "#DC2626",
  RAIL: "#DC2626",
  SHUTTLE: "#EC4899",
};

export const MODE_LABELS: Record<TransportationMode, string> = {
  walk: "Walking",
  transit: "Transit",
  car: "Driving",
  shuttle: "Shuttle",
};

export const MODE_INFO_COLORS: Record<TransportationMode, string> = {
  walk: "#3B82F6",
  transit: "#8B5CF6",
  car: "#F59E0B",
  shuttle: "#EC4899",
};
