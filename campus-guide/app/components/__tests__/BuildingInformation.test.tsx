import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import  BuildingInformation  from '../BuildingInformation';
import { Campus } from '@/constants/buildings';

const mockBuilding = {
  id: 'h',
  code: 'H',
  name: 'Henry F. Hall Building',
  campus: 'SGW' as Campus,
  address: '1455 De Maisonneuve Blvd. W.',
  lat: 45.497092,
  lng: -73.5788,
  x: 0,
  y: 0,
};

describe('BuildingInformation', () => {
  it('renders building information correctly', () => {
    // Arrange & Act
    const screen = render(
      <BuildingInformation
        building={mockBuilding}
        onGetDirections={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    // Assert
    expect(screen.getByText('H')).toBeTruthy();
    expect(screen.getByText('Henry F. Hall Building')).toBeTruthy();
    expect(screen.getByText('SGW Campus')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    // Arrange
    const onClose = jest.fn();
    const screen = render(
      <BuildingInformation
        building={mockBuilding}
        onGetDirections={jest.fn()}
        onClose={onClose}
      />
    );
    
    // Act
    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);
    
    // Assert
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onGetDirections when directions button is pressed', () => {
    // Arrange
    const onGetDirections = jest.fn();
    const screen = render(
      <BuildingInformation
        building={mockBuilding}
        onGetDirections={onGetDirections}
        onClose={jest.fn()}
      />
    );
    
    // Act
    const directionsButton = screen.getByText('Get Directions');
    fireEvent.press(directionsButton);
    
    // Assert
    expect(onGetDirections).toHaveBeenCalledWith(mockBuilding);
  });
});