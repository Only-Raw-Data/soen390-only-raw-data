export const MAP_CONSTANTS = {
  // Delta for animating closely to the user's location or building
  DEFAULT_CAMERA_DELTA: 0.005,
  // Delta for indoor building views where we need to be very zoomed in
  INDOOR_BUILDING_DELTA: 0.002,
  // Delta for animating to a whole campus
  CAMPUS_CAMERA_DELTA: 0.01,
  // Minimum delta movement required to trigger a region update (e.g. for POIs)
  REGION_UPDATE_THRESHOLD: 0.005,
  // Maximum zoom delta allowed to trigger auto-switching of campuses
  AUTO_SWITCH_MAX_DELTA: 0.02,
  // Default animation duration for moving the map in ms
  ANIMATION_DURATION_MS: 1000,
  // Faster animation duration for indoor transitions
  INDOOR_ANIMATION_MS: 500,
  // Edge padding when fitting elements (routes) on the map
  ROUTE_EDGE_PADDING: { top: 150, right: 50, bottom: 50, left: 50 },
};

