import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapViewApp } from '../MapView';
import { useDirections } from '../../context/DirectionsContext';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// Mock useDirections
jest.mock('../../context/DirectionsContext', () => ({
  useDirections: jest.fn(),
}));

// Mock usePathname and useRouter
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

describe('MapView', () => {
  const mockSetStartBuilding = jest.fn();
  const mockSetDestinationBuilding = jest.fn();

  beforeEach(() => {
    (useDirections as jest.Mock).mockReturnValue({
      startBuilding: null,
      destinationBuilding: null,
      setStartBuilding: mockSetStartBuilding,
      setDestinationBuilding: mockSetDestinationBuilding,
    });
  });

  it('renders without crashing', () => {
    // Arrange
    const { getByPlaceholderText } = render(<MapView />);

    // Assert
    expect(getByPlaceholderText('Search buildings...')).toBeTruthy();
  });

  it('renders campus toggle buttons', () => {
    // Arrange
    const { getByText } = render(<MapView />);

    // Assert
    expect(getByText('SGW Campus')).toBeTruthy();
    expect(getByText('Loyola Campus')).toBeTruthy();
  });

  it('defaults to SGW campus', () => {
    // Arrange
    const { getByText, queryByText } = render(<MapView />);

    // Assert
    expect(getByText('H')).toBeTruthy();
    expect(getByText('MB')).toBeTruthy();
    expect(getByText('EV')).toBeTruthy();
    expect(queryByText('CC')).toBeNull();
    expect(queryByText('SP')).toBeNull();
  });

  it('switches back to SGW campus', () => {
    // Arrange
    const { getByText, queryByText } = render(<MapView />);

    // Act
    fireEvent.press(getByText('Loyola Campus'));

    // Assert
    expect(getByText('CC')).toBeTruthy();
    expect(queryByText('H')).toBeNull();
    fireEvent.press(getByText('SGW Campus'));
    expect(getByText('H')).toBeTruthy();
    expect(queryByText('CC')).toBeNull();
  });

  describe('Search functionality', () => {
    it('filters buildings by name', () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      // Act
      fireEvent.changeText(searchInput, 'Hall');

      // Assert
      expect(getByText('H')).toBeTruthy();
    });

    it('filters buildings by code', () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      // Act
      fireEvent.changeText(searchInput, 'MB');

      // Assert
      expect(getByText('MB')).toBeTruthy();
    });

    it('is case insensitive', () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      // Act
      fireEvent.changeText(searchInput, 'engineering');

      // Assert
      expect(getByText('EV')).toBeTruthy();
    });

    it('clears search results when input is cleared', () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      // Act
      fireEvent.changeText(searchInput, 'Hall');
      fireEvent.changeText(searchInput, '');

      // Assert
      expect(getByText('H')).toBeTruthy();
      expect(getByText('MB')).toBeTruthy();
      expect(getByText('EV')).toBeTruthy();
    });
  });

  describe('Building markers', () => {
    it('renders SGW building markers', () => {
      // Arrange
      const { getByText } = render(<MapView />);

      // Assert
      expect(getByText('H')).toBeTruthy();
      expect(getByText('MB')).toBeTruthy();
      expect(getByText('EV')).toBeTruthy();
      expect(getByText('LB')).toBeTruthy();
      expect(getByText('VA')).toBeTruthy();
      expect(getByText('GM')).toBeTruthy();
    });

    it('renders Loyola building markers when campus is switched', () => {
      // Arrange
      const { getByText } = render(<MapView />);

      // Act
      fireEvent.press(getByText('Loyola Campus'));

      // Assert
      expect(getByText('CC')).toBeTruthy();
      expect(getByText('SP')).toBeTruthy();
      expect(getByText('AD')).toBeTruthy();
      expect(getByText('FC')).toBeTruthy();
      expect(getByText('PC')).toBeTruthy();
    });

    it('renders the map container', () => {
      // Arrange
      const { getByTestId } = render(<MapView />);

      // Assert
      expect(getByTestId('mapView')).toBeTruthy();
    });
  });

  describe('Building selection', () => {
    it('shows Get Directions button in building info', () => {
      // Arrange
      const { getByText } = render(<MapView />);

      // Act
      fireEvent.press(getByText('H'));

      // Assert
      expect(getByText('Get Directions')).toBeTruthy();
    });

    it('clears selected building when switching campuses', () => {
      // Arrange
      const { getByText, queryByText } = render(<MapView />);

      // Act
      fireEvent.press(getByText('H'));

      // Assert
      expect(getByText('Henry F. Hall Building')).toBeTruthy();

      fireEvent.press(getByText('Loyola Campus'));

      expect(queryByText('Henry F. Hall Building')).toBeNull();
    });
  });

  describe('Integration tests', () => {
    it('search works across campus switches', () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      // Act
      fireEvent.changeText(searchInput, 'Hall');

      // Assert
      expect(getByText('H')).toBeTruthy();

      // Act
      fireEvent.press(getByText('Loyola Campus'));

      fireEvent.changeText(searchInput, 'Central');

      // Assert
      expect(getByText('CC')).toBeTruthy();
    });

    it('handles selecting different buildings', () => {
      // Arrange
      const { getByText } = render(<MapView />);

      // Act
      fireEvent.press(getByText('H'));

      // Assert
      expect(getByText('Henry F. Hall Building')).toBeTruthy();

      fireEvent.press(getByText('MB'));
      expect(getByText('John Molson Building')).toBeTruthy();
    });
  });
});
