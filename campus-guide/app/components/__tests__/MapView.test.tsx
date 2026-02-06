import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MapViewApp } from '../MapView';
import { useDirections } from '../../context/DirectionsContext';
import { useBuildingPolygons } from '../../hooks/useBuildingPolygons';
import { useUserLocation } from '../../hooks/useUserLocation';

//Mocks
jest.mock('../../context/DirectionsContext', () => ({
  useDirections: jest.fn(),
}));

jest.mock('../../hooks/useBuildingPolygons', () => ({
  useBuildingPolygons: jest.fn(),
}));

jest.mock('../../hooks/useUserLocation', () => ({
  useUserLocation: jest.fn(),
}));

jest.mock('../../../constants/mapStyle', () => ({
  CAMPUS_MAP_STYLE: [],
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('../BuildingSearchComponent', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return function MockSearch(props: any) {
    return (
      <TextInput
        placeholder="Search buildings..."
        value={props.value}
        onChangeText={props.onChangeText}
      />
    );
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  const MockMapView = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <View testID="mapView" {...props}>{children}</View>
  ));

  const MockMarker = ({ title, onPress }: any) => (
    <Text accessibilityRole="button" onPress={onPress}>{title}</Text>
  );

  const MockPolygon = ({ onPress, coordinates }: any) => (
    <TouchableOpacity
      testID="building-polygon"
      onPress={onPress}
      accessibilityLabel={`polygon-${coordinates?.length || 0}-coords`}
    />
  );

  const MockCircle = () => null;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    Circle: MockCircle,
    PROVIDER_GOOGLE: 'google',
  };
});

// Mock LocateMeButton
jest.mock('../LocateMeButton', () => ({
  LocateMeButton: ({ onLocate }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="locate-me-button" onPress={onLocate}>
        <Text>Locate Me</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock polygon data for tests
const mockSGWPolygons = [
  {
    buildingId: 'h',
    coordinates: [
      { latitude: 45.497092, longitude: -73.5788 },
      { latitude: 45.497192, longitude: -73.5788 },
      { latitude: 45.497192, longitude: -73.5778 },
      { latitude: 45.497092, longitude: -73.5778 },
    ],
  },
  {
    buildingId: 'mb',
    coordinates: [
      { latitude: 45.495304, longitude: -73.579044 },
      { latitude: 45.495404, longitude: -73.579044 },
      { latitude: 45.495404, longitude: -73.578044 },
      { latitude: 45.495304, longitude: -73.578044 },
    ],
  },
];

const mockLoyolaPolygons = [
  {
    buildingId: 'cc',
    coordinates: [
      { latitude: 45.458204, longitude: -73.6403 },
      { latitude: 45.458304, longitude: -73.6403 },
      { latitude: 45.458304, longitude: -73.6393 },
      { latitude: 45.458204, longitude: -73.6393 },
    ],
  },
];

describe('MapViewApp', () => {
  const mockSetStartBuilding = jest.fn();
  const mockSetDestinationBuilding = jest.fn();
  const mockGetCurrentLocation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDirections as jest.Mock).mockReturnValue({
      startBuilding: null,
      destinationBuilding: null,
      setStartBuilding: mockSetStartBuilding,
      setDestinationBuilding: mockSetDestinationBuilding,
    });

    // Default mock for building polygons - returns SGW polygons
    (useBuildingPolygons as jest.Mock).mockReturnValue({
      polygons: mockSGWPolygons,
      loading: false,
      error: null,
    });

    // Default mock for user location
    (useUserLocation as jest.Mock).mockReturnValue({
      location: null,
      isLoading: false,
      errorMsg: null,
      nearestBuilding: null,
      isOnCampus: false,
      currentCampus: null,
      getCurrentLocation: mockGetCurrentLocation,
      startLocationTracking: jest.fn(),
      stopLocationTracking: jest.fn(),
      requestLocationPermission: jest.fn(),
    });
  });

  it('renders search when showSearch=true', () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    // Act
    const input = screen.getByPlaceholderText('Search buildings...');
    // Assert
    expect(input).toBeTruthy();
  });

  it('renders campus toggle buttons', () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    // Act
    const sgw = screen.getByText('SGW Campus');
    const loyola = screen.getByText('Loyola Campus');
    // Assert
    expect(sgw).toBeTruthy();
    expect(loyola).toBeTruthy();
  });

  it('renders map container', () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    const map = screen.getByTestId('mapView');
    // Assert
    expect(map).toBeTruthy();
  });

  it('defaults to SGW markers', () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    const hall = screen.getByText('H');
    const molson = screen.getByText('MB');
    // Assert
    expect(hall).toBeTruthy();
    expect(molson).toBeTruthy();
  });

  it('switches to Loyola campus', () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText('Loyola Campus'));
    // Assert
    expect(screen.getByText('CC')).toBeTruthy();
  });


  it('filters buildings by name', () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    const input = screen.getByPlaceholderText('Search buildings...');
    // Act
    fireEvent.changeText(input, 'Hall');
    // Assert
    expect(screen.getByText('H')).toBeTruthy();
  });

  it('filters buildings by code', () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    const input = screen.getByPlaceholderText('Search buildings...');
    // Act
    fireEvent.changeText(input, 'MB');
    // Assert
    expect(screen.getByText('MB')).toBeTruthy();
  });

  it('is case insensitive', () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    const input = screen.getByPlaceholderText('Search buildings...');
    // Act
    fireEvent.changeText(input, 'engineering');
    // Assert
    expect(screen.getByText('EV')).toBeTruthy();
  });


  it('shows building info popup', () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText('H'));
    // Assert
    expect(screen.getByText('Henry F. Hall Building')).toBeTruthy();
  });

  it('sets start building on first press', () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText('H'));
    // Assert
    expect(mockSetStartBuilding).toHaveBeenCalledWith(expect.objectContaining({ id: 'h' }));
  });

  it('sets destination building when start exists', () => {
    // Arrange
    (useDirections as jest.Mock).mockReturnValue({
      startBuilding: { id: 'h' },
      destinationBuilding: null,
      setStartBuilding: mockSetStartBuilding,
      setDestinationBuilding: mockSetDestinationBuilding,
    });

    const screen = render(<MapViewApp />);

    // Act
    fireEvent.press(screen.getByText('MB'));
    // Assert
    expect(mockSetDestinationBuilding).toHaveBeenCalledWith(expect.objectContaining({ id: 'mb' }));
  });


  it('search works across campus switches', () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    const input = screen.getByPlaceholderText('Search buildings...');
    // Act
    fireEvent.changeText(input, 'Hall');
    fireEvent.press(screen.getByText('Loyola Campus'));
    fireEvent.changeText(input, 'Central');
    // Assert
    expect(screen.getByText('CC')).toBeTruthy();
  });

  // Polygon tests
  describe('Building Polygons', () => {
    it('renders polygons for current campus buildings', () => {
      // Arrange & Act
      const screen = render(<MapViewApp />);
      const polygons = screen.getAllByTestId('building-polygon');
      // Assert - should have 2 SGW polygons from mock
      expect(polygons.length).toBe(2);
    });

    it('calls useBuildingPolygons with correct campus', () => {
      // Arrange & Act
      render(<MapViewApp />);
      // Assert
      expect(useBuildingPolygons).toHaveBeenCalledWith('SGW');
    });

    it('switches polygon data when changing campuses', () => {
      // Arrange
      (useBuildingPolygons as jest.Mock).mockImplementation((campus: string) => ({
        polygons: campus === 'SGW' ? mockSGWPolygons : mockLoyolaPolygons,
        loading: false,
        error: null,
      }));

      const screen = render(<MapViewApp />);

      // Act - switch to Loyola
      fireEvent.press(screen.getByText('Loyola Campus'));

      // Assert - useBuildingPolygons should be called with 'Loyola'
      expect(useBuildingPolygons).toHaveBeenCalledWith('Loyola');
    });

    it('polygon tap triggers building selection', () => {
      // Arrange
      const screen = render(<MapViewApp />);
      const polygons = screen.getAllByTestId('building-polygon');

      // Act - tap first polygon (H building)
      fireEvent.press(polygons[0]);

      // Assert
      expect(mockSetStartBuilding).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'h' })
      );
    });

    it('handles empty polygon data gracefully', () => {
      // Arrange
      (useBuildingPolygons as jest.Mock).mockReturnValue({
        polygons: [],
        loading: false,
        error: null,
      });

      // Act & Assert - should not throw
      const screen = render(<MapViewApp />);
      expect(screen.getByTestId('mapView')).toBeTruthy();
    });

    it('renders with loading state', () => {
      // Arrange
      (useBuildingPolygons as jest.Mock).mockReturnValue({
        polygons: [],
        loading: true,
        error: null,
      });

      // Act & Assert - should render map even while loading
      const screen = render(<MapViewApp />);
      expect(screen.getByTestId('mapView')).toBeTruthy();
    });
  });

  // Location feature tests
  describe('Location Feature', () => {
    it('renders locate me button', () => {
      const screen = render(<MapViewApp />);
      expect(screen.getByTestId('locate-me-button')).toBeTruthy();
    });

    it('calls getCurrentLocation when locate button pressed', () => {
      const screen = render(<MapViewApp />);
      fireEvent.press(screen.getByTestId('locate-me-button'));
      expect(mockGetCurrentLocation).toHaveBeenCalled();
    });

    it('uses location hook', () => {
      render(<MapViewApp />);
      expect(useUserLocation).toHaveBeenCalled();
    });
  });
});
