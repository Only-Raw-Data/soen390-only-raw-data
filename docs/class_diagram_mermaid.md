classDiagram
    direction TB

    %% ==========================================
    %% STYLING & LEGEND
    %% ==========================================
    classDef current fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef planned fill:#fff3e0,stroke:#e65100,stroke-width:2px,stroke-dasharray: 5 5;
    classDef external fill:#f3e5f5,stroke:#4a148c,stroke-width:1px;
    classDef type fill:#f5f5f5,stroke:#616161,stroke-width:1px;

    %% ==========================================
    %% LAYER 1: DATA MODELS & TYPES (Model)
    %% ==========================================
    namespace DataModels {
        class NodeType:::type {
            <<Enumeration>>
            room, waypoint, elevator, staircase
        }
        class EdgeType:::type {
            <<Enumeration>>
            corridor, elevator, staircase
        }
        class Building:::current {
            +String id
            +String name
            +String code
            +Campus campus
            +number lat
            +number lng
            +String address
        }
        class BuildingPolygon:::current {
            +String buildingId
            +Coordinate[] coordinates
        }
        class IndoorBuildingConfig:::current {
            +String code
            +String name
            +Campus campus
            +number[] floors
            +String dataFile
            +number centerLat
            +number centerLng
        }
        class GraphNode:::current {
            +String id
            +number lat
            +number lng
            +number floor
            +NodeType type
            +String ref
        }
        class GraphEdge:::current {
            +String from
            +String to
            +number weight
            +EdgeType type
        }
        class IndoorGraph:::current {
            +Map nodes
            +GraphEdge[] edges
            +Map adjacency
        }
        class IndoorFeature:::current {
            +String type
            +IndoorFeatureProperties properties
            +geometry
        }
        class IndoorFeatureProperties:::current {
            +String level
            +String ref
            +String indoor
            +String name
        }
        class RouteData:::current {
            +Coordinate[] coordinates
            +String duration
            +String distance
            +String encodedPolyline
        }
        class TransportationMode:::type {
            <<Enumeration>>
            walk, drive, bicycle, transit, shuttle
        }
        %% PLANNED MODELS
        class Room:::planned {
            +String id
            +number floor
            +RoomType type
        }
        class CalendarEvent:::planned {
            +String id
            +Date startTime
            +String location
        }
        class OutdoorPOI:::planned {
            +String id
            +POIType type
        }
    }

    note for Building "Pattern: Model"
    note for IndoorGraph "Pattern: Model (Data Structure)"

    %% ==========================================
    %% LAYER 2: CONTEXTS & STATE (Controller / Observer)
    %% ==========================================
    namespace State {
        class DirectionsContext:::current {
            +Building startBuilding
            +Building destinationBuilding
            +startCoords
            +TransportationMode transportationMode
            +RouteData route
            +boolean isLoadingRoute
            +fetchRoute()
            +clearDirections()
            +swapLocations()
        }
        class IndoorMapContext:::current {
            +IndoorBuildingConfig selectedBuilding
            +number selectedFloor
            +String startRoomRef
            +String destinationRoomRef
            +GraphNode[] currentPath
            +String pathError
            +searchRoom(query)
            +setSelectedFloor(floor)
        }
        class UserLocationState:::current {
            +LocationObject location
            +String errorMsg
            +PermissionStatus permissionStatus
            +boolean isLoading
            +Building nearestBuilding
            +boolean isOnCampus
            +Campus currentCampus
        }
        class CalendarContext:::planned {
            +CalendarEvent[] events
            +fetchEvents()
        }
        class POIContext:::planned {
            +OutdoorPOI[] pois
            +fetchNearbyPOIs()
        }
    }

    note for DirectionsContext "Pattern: Observer / Controller"
    note for IndoorMapContext "Pattern: Observer / Controller"

    %% ==========================================
    %% LAYER 3: SERVICES (Facade / Strategy - Functional)
    %% ==========================================
    namespace Services {
        class directionsService:::current {
            <<Functional Service>>
            +fetchDirections()
            -modeMapping
        }
        class indoorGraphService:::current {
            <<Functional Service>>
            +buildIndoorGraph()
            +haversineDistance()
        }
        class indoorPathService:::current {
            <<Functional Service>>
            +findIndoorPath()
            -dijkstra()
        }
        class CalendarService:::planned {
            +authenticate()
            +fetchEvents()
        }
        class POIService:::planned {
            +fetchNearbyPOIs()
        }
    }

    note for directionsService "Pattern: Facade / Strategy (Export functions)"
    note for indoorGraphService "Pattern: Facade (Export functions)"

    %% ==========================================
    %% LAYER 4: HOOKS (Adapter)
    %% ==========================================
    namespace CustomHooks {
        class useUserLocation:::current {
            +UserLocationState state
            +getCurrentLocation()
            +startLocationTracking()
        }
        class useBuildingPolygons:::current {
            +BuildingPolygon[] polygons
            +boolean loading
        }
        class useDirections:::current {
            <<Exported from Context>>
            +DirectionsContext state
        }
        class useIndoorMap:::current {
            <<Exported from Context>>
            +IndoorMapContext state
        }
        class useCalendarIntegration:::planned {
            +CalendarEvent nextClass
        }
        class usePOILocations:::planned {
            +OutdoorPOI[] pois
        }
    }

    note for useUserLocation "Pattern: Adapter"
    note for useBuildingPolygons "Pattern: Adapter"

    %% ==========================================
    %% LAYER 5: PRESENTATION (View)
    %% ==========================================
    namespace Components {
        class MapViewApp:::current {
            +selectedCampus
            +handleBuildingPress()
        }
        class IndoorMapView:::current {
            +pathReady
            +handleFloorSelect()
        }
        class DirectionsHeader:::current {
            +transportationMode
        }
        class BuildingSearchComponent:::current {
            +value
        }
        class BuildingInformation:::current {
            +building
        }
        class ShuttleSchedule:::current {
            +visible
        }
        class LocateMeButton:::current {
            +onLocate()
        }
        class RoomSearchBar:::current {
            +onSubmit()
        }
        class Header:::current
        class BottomNav:::current
        class ClassScheduleScreen:::planned {
            +EventList
        }
        class POIDiscoveryScreen:::planned {
            +POIList
        }
    }

    note for MapViewApp "Pattern: View (Composition)"
    note for IndoorMapView "Pattern: View (Composition)"

    %% ==========================================
    %% LAYER 6: EXTERNAL / UTILS
    %% ==========================================
    namespace External {
        class GoogleRoutesAPI:::external
        class OverpassAPI:::external
        class ExpoLocation:::external
        class GoogleCalendarAPI:::external
    }

    %% ==========================================
    %% RELATIONSHIPS
    %% ==========================================

    %% Context -> Service
    DirectionsContext ..> directionsService : "calls"
    IndoorMapContext ..> indoorGraphService : "calls"
    IndoorMapContext ..> indoorPathService : "calls"
    CalendarContext ..> CalendarService
    POIContext ..> POIService

    %% Service -> External
    directionsService --> GoogleRoutesAPI
    useBuildingPolygons ..> OverpassAPI : "fetches"
    useUserLocation --> ExpoLocation
    CalendarService ..> GoogleCalendarAPI

    %% Component Layout
    MapViewApp *-- IndoorMapView
    MapViewApp *-- BuildingInformation
    MapViewApp *-- BuildingSearchComponent
    MapViewApp *-- LocateMeButton
    IndoorMapView *-- RoomSearchBar
    DirectionsHeader *-- ShuttleSchedule
    DirectionsHeader *-- BuildingSearchComponent
    
    %% Hooks Data Flow
    MapViewApp --> useUserLocation
    MapViewApp --> useBuildingPolygons
    MapViewApp --> useDirections
    IndoorMapView --> useIndoorMap
    DirectionsHeader --> useDirections
    ClassScheduleScreen ..> useCalendarIntegration
    POIDiscoveryScreen ..> usePOILocations

    %% Cross-Context Interactions (The "Wave" ≋ relationships)
    ClassScheduleScreen ..> DirectionsContext : "Quick Directions"
    IndoorMapView ..> useUserLocation : "Floor Context"

    %% Data Dependencies
    IndoorGraph o-- GraphNode
    IndoorGraph o-- GraphEdge
    IndoorMapContext --> IndoorGraph : "manages"
    IndoorGeoJSON *-- IndoorFeature
    IndoorFeature *-- IndoorFeatureProperties
    BuildingPolygon "1" -- "1" Building : "for"
    CalendarEvent --> Building : "located at"
    CalendarEvent --> Room : "located in"
