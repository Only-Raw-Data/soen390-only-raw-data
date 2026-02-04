import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapViewApp } from '../MapView';
import { useDirections } from '../../context/DirectionsContext';

//Mocks
jest.mock('../../context/DirectionsContext', () => ({
  useDirections: jest.fn(),
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
  const { View, Text } = require('react-native');

  const MockMapView = ({ children, ...props }: any) => (
    <View testID="mapView" {...props}>{children}</View>
  );

  const MockMarker = ({ title, onPress }: any) => (
    <Text accessibilityRole="button" onPress={onPress}>{title}</Text>
  );

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    PROVIDER_GOOGLE: 'google',
  };
});

describe('MapViewApp', () => {
  const mockSetStartBuilding = jest.fn();
  const mockSetDestinationBuilding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useDirections as jest.Mock).mockReturnValue({
      startBuilding: null,
      destinationBuilding: null,
      setStartBuilding: mockSetStartBuilding,
      setDestinationBuilding: mockSetDestinationBuilding,
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
});
