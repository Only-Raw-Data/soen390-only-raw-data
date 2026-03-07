# Pull Request

## Title

feat(indoor): Cross-building navigation with story mode (US 3.6)

## Commit Message

feat(indoor): add cross-building navigation with story mode

## Description

### Summary

Implements cross-building indoor navigation (US 3.6). When a user searches for directions between rooms in different buildings, the system now provides a multi-segment route instead of returning "no path found."

The navigation is presented as a step-by-step "story mode":
1. **Indoor exit** - path from the start room to the nearest building entrance
2. **Outdoor walk** - walking route between the two buildings
3. **Indoor enter** - path from the destination building entrance to the target room

### Changes

#### New Files
- **`app/types/navigation.ts`** - Type definitions for `IndoorStep`, `OutdoorStep`, and `NavigationStep`
- **`app/services/crossBuildingRouteService.ts`** - Orchestrates the 3-step cross-building route planning (resolve rooms to buildings, compute indoor exit/enter paths, fetch outdoor walking route)
- **`app/components/StoryOutdoorMap.tsx`** - Minimal outdoor map component for the walking segment (polyline, start/end markers, duration/distance)
- **`app/services/__tests__/crossBuildingRouteService.test.ts`** - Tests for same-building, cross-building, unknown rooms, and API failure fallback scenarios

#### Modified Files
- **`app/services/indoorGraphService.ts`**
  - Added `NodeType.Entrance` to enum
  - Added Pass 3: processes GeoJSON Point features with `entrance: "yes"` to create entrance nodes connected to nearest corridor waypoints
  - Added `findEntranceNodes()` helper to retrieve all entrance nodes from a graph
  - Added `getOrBuildGraph()` with module-level cache for shared graph access

- **`app/services/indoorPathService.ts`**
  - Added `findPathToNearestEntrance()` - Dijkstra from a room, terminates at first entrance node reached
  - Added `findPathFromEntrance()` - Dijkstra from destination backwards, picks nearest entrance, returns entrance-to-room path

- **`app/context/IndoorMapContext.tsx`**
  - Exported `findRoomInBuildings()` and `getGeoJsonForBuilding()` for use by cross-building service
  - Added `isCrossBuilding` flag to context - set when start and destination rooms are in different buildings

- **`app/components/IndoorMapView.tsx`**
  - Added story mode state (`storySteps`, `storyIndex`, `storyLoading`, `storyError`)
  - Cross-building banner with "Get Step-by-Step Directions" button when `isCrossBuilding` is true
  - Story mode UI: step indicator with progress dots, step labels, indoor/outdoor map rendering per step, Next/Previous navigation buttons, Exit Story Mode button

- **`app/services/__tests__/indoorGraphService.test.ts`** - Tests for entrance node creation, corridor connection, `findEntranceNodes`, `getOrBuildGraph` caching
- **`app/services/__tests__/indoorPathService.test.ts`** - Tests for `findPathToNearestEntrance` and `findPathFromEntrance`
- **`app/components/__tests__/IndoorMapView.test.tsx`** - Tests for cross-building banner, story mode rendering, step navigation, exit story mode

### Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| TASK 3.6.1 | Detect cross-building navigation | Done |
| TASK 3.6.2 | Generate exit route from starting building | Done |
| TASK 3.6.3 | Generate outdoor route between buildings | Done |
| TASK 3.6.4 | Generate indoor route to destination room | Done |
| TASK 3.6.5 | Combine indoor and outdoor navigation steps | Done |

### Test Plan

- [x] All 356 tests pass (`npx jest --no-coverage`)
- [ ] Open Indoor tab, search start `H-820`, destination `MBS2.210`
- [ ] Verify "These rooms are in different buildings" banner appears
- [ ] Press "Get Step-by-Step Directions" button
- [ ] Verify Step 1: Indoor map of Hall building, path from H820 to exit
- [ ] Press Next - Verify Step 2: Outdoor walking route from Hall to JMSB
- [ ] Press Next - Verify Step 3: Indoor map of JMSB, path from entrance to MBS2.210
- [ ] Press Previous - navigates back correctly
- [ ] Press "Exit Story Mode" - returns to normal indoor view
- [ ] Test same-building rooms (e.g., H-820 to H-857) still work normally with single indoor path
