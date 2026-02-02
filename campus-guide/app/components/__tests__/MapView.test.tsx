import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapView } from '../MapView';
import { useDirections } from '../../context/DirectionsContext';

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
    const { getByPlaceholderText } = render(<MapView />);
    expect(getByPlaceholderText('Search buildings...')).toBeTruthy();
  });

  it('renders campus toggle buttons', () => {
    const { getByText } = render(<MapView />);
    expect(getByText('SGW Campus')).toBeTruthy();
    expect(getByText('Loyola Campus')).toBeTruthy();
  });

  it('defaults to SGW campus', () => {
    const { getByText, queryByText } = render(<MapView />);

    expect(getByText('H')).toBeTruthy();
    expect(getByText('MB')).toBeTruthy();
    expect(getByText('EV')).toBeTruthy();
    expect(queryByText('CC')).toBeNull();
    expect(queryByText('SP')).toBeNull();
  });

  it('switches back to SGW campus', () => {
    const { getByText, queryByText } = render(<MapView />);

    fireEvent.press(getByText('Loyola Campus'));
    expect(getByText('CC')).toBeTruthy();
    expect(queryByText('H')).toBeNull();
    fireEvent.press(getByText('SGW Campus'));
    expect(getByText('H')).toBeTruthy();
    expect(queryByText('CC')).toBeNull();
  });

  describe('Search functionality', () => {
    it('filters buildings by name', () => {
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      fireEvent.changeText(searchInput, 'Hall');

      expect(getByText('H')).toBeTruthy();
    });

    it('filters buildings by code', () => {
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      fireEvent.changeText(searchInput, 'MB');

      expect(getByText('MB')).toBeTruthy();
    });

    it('is case insensitive', () => {
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      fireEvent.changeText(searchInput, 'engineering');

      expect(getByText('EV')).toBeTruthy();
    });

    it('clears search results when input is cleared', () => {
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      fireEvent.changeText(searchInput, 'Hall');
      fireEvent.changeText(searchInput, '');

      expect(getByText('H')).toBeTruthy();
      expect(getByText('MB')).toBeTruthy();
      expect(getByText('EV')).toBeTruthy();
    });
  });

  describe('Building markers', () => {
    it('renders SGW building markers', () => {
      const { getByText } = render(<MapView />);

      expect(getByText('H')).toBeTruthy();
      expect(getByText('MB')).toBeTruthy();
      expect(getByText('EV')).toBeTruthy();
      expect(getByText('LB')).toBeTruthy();
      expect(getByText('VA')).toBeTruthy();
      expect(getByText('GM')).toBeTruthy();
    });

    it('renders Loyola building markers when campus is switched', () => {
      const { getByText } = render(<MapView />);

      fireEvent.press(getByText('Loyola Campus'));

      expect(getByText('CC')).toBeTruthy();
      expect(getByText('SP')).toBeTruthy();
      expect(getByText('AD')).toBeTruthy();
      expect(getByText('FC')).toBeTruthy();
      expect(getByText('PC')).toBeTruthy();
    });

    it('renders the map container', () => {
      const { getByTestId } = render(<MapView />);

      expect(getByTestId('mapView')).toBeTruthy();
    });
  });

  describe('Building selection', () => {
    it('shows Get Directions button in building info', () => {
      const { getByText } = render(<MapView />);

      fireEvent.press(getByText('H'));

      expect(getByText('Get Directions')).toBeTruthy();
    });

    it('clears selected building when switching campuses', () => {
      const { getByText, queryByText } = render(<MapView />);

      fireEvent.press(getByText('H'));
      expect(getByText('Henry F. Hall Building')).toBeTruthy();

      fireEvent.press(getByText('Loyola Campus'));

      expect(queryByText('Henry F. Hall Building')).toBeNull();
    });
  });

  describe('Integration tests', () => {
    it('search works across campus switches', () => {
      const { getByPlaceholderText, getByText } = render(<MapView />);
      const searchInput = getByPlaceholderText('Search buildings...');

      fireEvent.changeText(searchInput, 'Hall');
      expect(getByText('H')).toBeTruthy();

      fireEvent.press(getByText('Loyola Campus'));

      fireEvent.changeText(searchInput, 'Central');
      expect(getByText('CC')).toBeTruthy();
    });

    it('handles selecting different buildings', () => {
      const { getByText } = render(<MapView />);

      fireEvent.press(getByText('H'));
      expect(getByText('Henry F. Hall Building')).toBeTruthy();

      fireEvent.press(getByText('MB'));
      expect(getByText('John Molson Building')).toBeTruthy();
    });
  });
});
