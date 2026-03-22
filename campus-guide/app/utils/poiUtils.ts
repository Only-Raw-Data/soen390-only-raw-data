import { Campus, Building } from "@/constants/buildings";
import { PointOfInterest } from "../types/poi";

/**
 * Adapts a PointOfInterest to the Building interface.
 * This allows it to be used seamlessly with DirectionsContext for routing.
 * 
 * @param poi The PointOfInterest to adapt
 * @param currentCampus The campus context to associate with this POI 
 *                      (so cross-campus logic doesn't wrongly trigger if unneeded, 
 *                       or triggers correctly if the POI is near a specific campus)
 * @returns A Building object representing the POI
 */
export const poiToBuildingAdapter = (poi: PointOfInterest, currentCampus: Campus): Building => {
  // We upper case and replace underscores with spaces for a cleaner code/display name
  const displayCode = poi.type ? poi.type.replaceAll("_", " ").toUpperCase() : "POI";
  
  return {
    id: `poi-${poi.id}`,
    name: poi.name,
    code: displayCode,
    address: poi.address || "Point of Interest",
    lat: poi.lat,
    lng: poi.lon,
    campus: currentCampus,
    department: "",
    overview: "",
    accessibility: "",
    x: 0,
    y: 0,
  };
};
