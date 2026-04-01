/** Named usability test tasks for use with useTaskSession */

/** Stable objects for PostHog task_started / task_completed (avoid new refs each render). */
export const USABILITY_ANALYTICS_T5 = {
  epic: "Epic 2: Outdoor Directions",
  user_stories: "US 2.6",
} as const;

export const USABILITY_ANALYTICS_T6 = {
  epic: "Epic 3: Indoor Directions",
  user_stories: "US 3.1, US 3.2",
} as const;

export const USABILITY_ANALYTICS_T7 = {
  epic: "Epic 3: Indoor Directions",
  user_stories: "US 3.3",
} as const;

export const USABILITY_ANALYTICS_T8 = {
  epic: "Epic 4: Directions to My Next Class",
  user_stories: "US 4.1, US 4.3",
} as const;

export const USABILITY_ANALYTICS_T9 = {
  epic: "Epic 5: Outdoor Points of Interest Discovery",
  user_stories: "US 5.1, US 5.2",
} as const;

export const USABILITY_TASK_TOGGLE_LOYOLA_CAMPUS = {
  id: "toggle_loyola_campus",
  name: "Toggle to Loyola campus on the map",
} as const;

export const USABILITY_TASK_SELECT_BUILDING_INFO = {
  id: "select_building_info",
  name: "Open building information from the map",
} as const;

export const USABILITY_TASK_GET_DIRECTIONS = {
  id: "get_directions",
  name: "Get directions between two buildings",
} as const;

export const USABILITY_TASK_EXPLORE_TRANSPORT_MODES = {
  id: "explore_transport_modes",
  name: "Explore transportation modes after a route is shown",
} as const;

/** Epic 2 — US 2.6 */
export const USABILITY_TASK_T5_SHUTTLE = {
  id: "T5",
  name: "Generate directions using the Concordia shuttle service between campuses",
} as const;

/** Epic 3 — US 3.1, US 3.2 */
export const USABILITY_TASK_T6_INDOOR_SHORTEST = {
  id: "T6",
  name: "Enter a building and find the shortest route to a specific room number within that building",
} as const;

/** Epic 3 — US 3.3 */
export const USABILITY_TASK_T7_INDOOR_ACCESSIBLE = {
  id: "T7",
  name: "Find the accessible route to a classroom on an upper floor",
} as const;

/** Epic 4 — US 4.1, US 4.3 */
export const USABILITY_TASK_T8_CALENDAR = {
  id: "T8",
  name: "Connect your Google Calendar to the app and view your upcoming class location",
} as const;

/** Epic 5 — US 5.1, US 5.2 */
export const USABILITY_TASK_T9_POI = {
  id: "T9",
  name: "Find a nearby outdoor point of interest and generate directions to it",
} as const;
