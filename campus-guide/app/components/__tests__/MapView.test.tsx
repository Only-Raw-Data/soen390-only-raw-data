import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapViewApp } from '../MapView';
import { useDirections } from '../../context/DirectionsContext';

jest.mock('../../context/DirectionsContext', () => ({
  useDirections: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockMapView = ({ children, ...props }: any) => (
    <View testID="mapView" {...props}>
      {children}
    </View>
  );

  const MockMarker = ({ title, onPress }: any) => (
    <Text accessibilityRole="button" onPress={onPress}>
      {title}
    </Text>
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
    const { getByPlaceholderText } = render(<MapViewApp showSearch />);
    expect(getByPlaceholderText('Search buildings...')).toBeTruthy();
  });

  it('renders campus toggle buttons', () => {
    const { getByText } = render(<MapViewApp />);
    expect(getByText('SGW Campus')).toBeTruthy();
    expect(getByText('Loyola Campus')).toBeTruthy();
  });

  it('renders the map container', () => {
    const { getByTestId } = render(<MapViewApp />);
    expect(getByTestId('mapView')).toBeTruthy();
  });

  it('defaults to SGW campus markers', () => {
    const { getByText, queryByText } = render(<MapViewApp />);
    expect(getByText('H')).toBeTruthy();
    expect(getByText('MB')).toBeTruthy();
    expect(getByText('EV')).toBeTruthy();
    expect(queryByText('CC')).toBeNull();
  });

  it('switches to Loyola campus markers', () => {
    const { getByText, queryByText } = render(<MapViewApp />);

    // Act
    fireEvent.press(getByText('Loyola Campus'));

    expect(getByText('CC')).toBeTruthy();
    expect(getByText('SP')).toBeTruthy();
    expect(queryByText('H')).toBeNull();
  });
});
