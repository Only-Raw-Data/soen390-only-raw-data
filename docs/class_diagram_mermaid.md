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
    %% LAYER 1: DATA MODELS
    %% ==========================================
    namespace DataModels {
        class Building:::current {
            +String id
            +String name
            +String code
            +Campus campus
            +Coordinate coords
        }
        class RouteData:::current {
            +Coordinate[] coordinates
            +String duration
            +String distance
            +String encodedPolyline
        }
        class BuildingPolygon:::current {
            +String buildingId
            +Coordinate[] coordinates
        }
        class TransportationMode:::type {
            <<Enumeration>>
            WALK, CAR, TRANSIT, SHUTTLE
        }
        class Campus:::type {
            <<Enumeration>>
            SGW, Loyola
        }
        %% PLANNED MODELS
        class Room:::planned {
            +String id
            +Number floor
            +RoomType type
        }
        class IndoorRoute:::planned {
            +Room start
            +Room end
            +AccessibilityInfo a11y
        }
        class OutdoorPOI:::planned {
            +String id
            +POIType type
            +Number rating
        }
        class CalendarEvent:::planned {
            +String id
            +Date startTime
            +String location
        }
        class AccessibilityInfo:::planned {
            +Boolean isAccessible
            +Coordinate[] elevatorLocs
        }
    }

    %% ==========================================
    %% LAYER 2: CONTEXTS (STATE)
    %% ==========================================
    namespace State {
        class DirectionsContext:::current {
            +Building start
            +Building dest
            +RouteData route
            +setStart(Building)
            +fetchRoute()
        }
        class IndoorNavigationContext:::planned {
            +Number currentFloor
            +Room startRoom
            +IndoorRoute route
            +fetchIndoorRoute()
        }
        class CalendarContext:::planned {
            +CalendarEvent[] events
            +CalendarEvent nextClass
            +connectGoogle()
        }
        class POIContext:::planned {
            +OutdoorPOI[] pois
            +fetchNearbyPOIs()
        }
    }

    %% ==========================================
    %% LAYER 3: SERVICES
    %% ==========================================
    namespace Services {
        class DirectionsService:::current {
            +fetchDirections()
            -decodePolyline()
        }
        class IndoorNavigationService:::planned {
            +fetchIndoorRoute()
            +getRoomsInBuilding()
        }
        class CalendarService:::planned {
            +authenticate()
            +fetchEvents()
            +parseLocation()
        }
        class POIService:::planned {
            +fetchNearbyPOIs()
            +getPOIDetails()
        }
    }

    %% ==========================================
    %% LAYER 4: HOOKS
    %% ==========================================
    namespace CustomHooks {
        class useUserLocation:::current {
            +Location location
            +Building nearestBuilding
            +Boolean isOnCampus
        }
        class useBuildingPolygons:::current {
            +BuildingPolygon[] polygons
            +fetchFromOverpass()
        }
        class useDirections:::current {
            +Context state
        }
        %% PLANNED HOOKS
        class useIndoorNavigation:::planned {
            +Room[] rooms
            +IndoorRoute route
        }
        class useCalendarIntegration:::planned {
            +Boolean isConnected
            +CalendarEvent nextClass
        }
        class usePOILocations:::planned {
            +OutdoorPOI[] pois
        }
    }

    %% ==========================================
    %% LAYER 5: PRESENTATION (COMPONENTS)
    %% ==========================================
    namespace Components {
        class AppLayout:::current {
            +Tabs
        }
        class BottomNav:::current {
            +handleNavPress()
        }
        class Header:::current {
            +Title
        }
        class TabOneScreen:::current {
            Map Focus
        }
        class TabTwoScreen:::current {
            Directions Focus
        }
        class MapViewApp:::current {
            +renderMarkers()
            +renderPolygons()
            +handleBuildingPress()
        }
        class DirectionsHeader:::current {
            +handleSwap()
            +handleGetDirections()
        }
        class BuildingSearchComponent:::current {
            +handleSearch()
            +filterBuildings()
        }
        class BuildingInformation:::current {
            +PopupUI
        }
        class ShuttleSchedule:::current {
            +ModalUI
        }
        %% PLANNED SCREENS
        class IndoorNavigationScreen:::planned {
            +FloorSelector
            +RoomSearch
        }
        class ClassScheduleScreen:::planned {
            +EventList
            +NextClassHighlight
        }
        class POIDiscoveryScreen:::planned {
            +POIFilter
            +POIList
        }
    }

    %% ==========================================
    %% LAYER 6: EXTERNAL / UTILS
    %% ==========================================
    namespace External {
        class GoogleRoutesAPI:::external {
            v2
        }
        class OverpassAPI:::external {
            OSM Data
        }
        class GoogleCalendarAPI:::external {
            OAuth + Data
        }
        class LocationUtils:::external {
            +findNearestBuilding()
            +calculateDistance()
        }
        class Constants:::external {
            +SGW_BUILDINGS
            +LOYOLA_BUILDINGS
            +CAMPUS_MAP_STYLE
        }
    }

    %% ==========================================
    %% RELATIONSHIPS
    %% ==========================================

    %% Context -> Service
    DirectionsContext --> DirectionsService
    IndoorNavigationContext ..> IndoorNavigationService
    CalendarContext ..> CalendarService
    POIContext ..> POIService

    %% Service -> External
    DirectionsService --> GoogleRoutesAPI
    useBuildingPolygons --> OverpassAPI
    POIService ..> OverpassAPI
    CalendarService ..> GoogleCalendarAPI

    %% Component Structure (Composition)
    AppLayout *-- TabOneScreen
    AppLayout *-- TabTwoScreen
    AppLayout *-- BottomNav
    TabOneScreen *-- Header
    TabOneScreen *-- MapViewApp
    TabTwoScreen *-- Header
    TabTwoScreen *-- DirectionsHeader
    TabTwoScreen *-- MapViewApp
    
    %% UI Components Composition
    MapViewApp *-- BuildingInformation
    MapViewApp *-- BuildingSearchComponent
    DirectionsHeader *-- ShuttleSchedule
    DirectionsHeader *-- BuildingSearchComponent

    %% Component -> Hooks (Data Flow)
    MapViewApp --> useUserLocation
    MapViewApp --> useBuildingPolygons
    MapViewApp --> useDirections
    DirectionsHeader --> useDirections
    DirectionsHeader --> useUserLocation

    %% Planned Screen Connections
    IndoorNavigationScreen ..> useIndoorNavigation
    ClassScheduleScreen ..> useCalendarIntegration
    POIDiscoveryScreen ..> usePOILocations
    
    %% Cross-Context Interactions (The "Wave" ≋ relationships)
    ClassScheduleScreen ..> DirectionsContext : "Quick Directions"
    IndoorNavigationScreen ..> useUserLocation : "Floor Context"

    %% Data Dependencies
    BuildingPolygon "1" -- "1" Building : for
    RouteData "1" -- "*" Coordinate : contains
    IndoorRoute "1" -- "*" Room : connects
    CalendarEvent --> Building : located at
    CalendarEvent --> Room : located in
    
    %% Utility Usage
    useUserLocation --> LocationUtils
    LocationUtils --> Constants
    BuildingSearchComponent --> Constants