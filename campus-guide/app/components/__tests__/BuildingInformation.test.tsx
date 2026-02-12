import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Building, Campus } from '@/constants/buildings';


jest.mock('@/constants/buildingImages', () => ({
  BUILDING_IMAGES: {
      'h': require('@/assets/images/building_images/Screenshot2026-02-07at1.31.00PM.png'),
      'mb': require('@/assets/images/building_images/Screenshot2026-02-07at1.38.59PM.png'),
  }
}));

import BuildingInformation  from '../BuildingInformation';

jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));


describe('BuildingInformation Component', () => {
    const mockOnGetDirections = jest.fn();
    const mockOnClose = jest.fn();

    const mockBuildingWithImage: Building = {
      id: 'h',
      code: 'H',
      name: 'Hall Building',
      campus: 'SGW',
      address: '1455 De Maisonneuve Blvd. W.',
      lat: 45.497,
      lng: -73.579,
      department: 'Arts and Science, Engineering',
      accessibility: 'Wheelchair accessible entrance on De Maisonneuve',
      overview: 'The Hall Building is one of the main academic buildings at Concordia.',
      x: 0,
      y: 0,
    };

    const mockBuilding: Building = {
        id: 'building-1',
        name: 'Henry F. Hall Building',
        code: 'H-110',
        lat: 45.4972,
        lng: -73.5789,
        campus: 'Sir George Williams' as Campus,
        address: '1455 De Maisonneuve Blvd. W.',
        department: 'Engineering and Computer Science',
        overview: 'Main building on campus',
        accessibility: 'Wheelchair accessible',
        x: 0,
        y: 0, 
    };

    const mockBuildingMinimal: Building = {
        id: 'building-2',
        name: 'John Molson Building',
        code: 'MB',
        lat: 45.4950,
        lng: -73.5790,
        campus: 'Sir George Williams' as Campus,
        address: '1450 Guy St.',
        department: '',
        overview: '',
        accessibility: '',
        x: 0,
        y: 0,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Image Rendering', () => {
      it('renders building image when available', () => {
        // Arrange
          const { getByTestId } = render(
              <BuildingInformation
                  building={mockBuildingWithImage}
                  onGetDirections={mockOnGetDirections}
                  onClose={mockOnClose}
              />
          );
            // Act
          const image = getByTestId('building-image');
          // Assert
          expect(image).toBeTruthy();
          expect(image.props.source).toBeDefined();
      });

      it('does not render image container when building has no image', () => {
        // Arrange
          const { queryByTestId } = render(
              <BuildingInformation
                  building={mockBuilding}
                  onGetDirections={mockOnGetDirections}
                  onClose={mockOnClose}
              />
          );
            // Act
          const image = queryByTestId('building-image');
          // Assert
          expect(image).toBeNull();
      });

  });

    it('should render building information correctly', () => {
      // Arrange & Act
        const { getByText, getByTestId } = render(
            <BuildingInformation
                building={mockBuilding}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
                getDirectionsButtonText="Get Directions"
            />
        );
          // Assert
        expect(getByText('H-110')).toBeTruthy();
        expect(getByText('Henry F. Hall Building')).toBeTruthy();
        expect(getByTestId('building-info-name')).toBeTruthy();
        expect(getByText('Sir George Williams Campus')).toBeTruthy();
        expect(getByText('1455 De Maisonneuve Blvd. W.')).toBeTruthy();
    });
    //
    it('should hide sections when values are empty or "NA"', () => {
      // Arrange & Act
        const { queryByText } = render(
            <BuildingInformation
                building={mockBuildingMinimal}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
            />
        );
          // Assert
        expect(queryByText('Departments')).toBeNull();
        expect(queryByText('Accessibility')).toBeNull();
        expect(queryByText('Overview')).toBeNull();
    });

    it('should show sections when values are present', () => {
      // Arrange & Act
        const { getByText } = render(
            <BuildingInformation
                building={mockBuilding}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
            />
        );
          // Assert
        expect(getByText('Departments')).toBeTruthy();
        expect(getByText('Engineering and Computer Science')).toBeTruthy();
        expect(getByText('Accessibility')).toBeTruthy();
        expect(getByText('Wheelchair accessible')).toBeTruthy();
    });

    it('should toggle overview visibility when clicked', () => {
      // Arrange & Act
        const { getByText, queryByText } = render(
            <BuildingInformation
                building={mockBuilding}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
            />
        );
          // Assert
        expect(queryByText('Main building on campus')).toBeNull();

        fireEvent.press(getByText('Overview'));
        // Assert
        expect(getByText('Main building on campus')).toBeTruthy();

        fireEvent.press(getByText('Overview'));
        // Assert
        expect(queryByText('Main building on campus')).toBeNull();
    });

    it('should call onGetDirections when directions button is pressed', () => {
      // Arrange & Act
        const { getByText } = render(
            <BuildingInformation
                building={mockBuilding}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
            />
        );
        fireEvent.press(getByText('Get Directions'));
        // Assert
        expect(mockOnGetDirections).toHaveBeenCalledWith(mockBuilding);
    });

    it('should call onClose when close button is pressed', () => {
      // Arrange & Act
        const { getByTestId } = render(
            <BuildingInformation
                building={mockBuilding}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
            />
        );

        fireEvent.press(getByTestId('close-button'));
        // Assert
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show dynamic button text when provided', () => {
        // Arrange
        const dynamicText = "Set as Start";
        const { getByText } = render(
            <BuildingInformation
                building={mockBuilding}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
                getDirectionsButtonText={dynamicText}
            />
        );
        // Act & Assert
        expect(getByText(dynamicText)).toBeTruthy();
    });

    it('should show default button text when no dynamic text provided', () => {
        // Arrange
        const { getByText } = render(
            <BuildingInformation
                building={mockBuilding}
                onGetDirections={mockOnGetDirections}
                onClose={mockOnClose}
            />
        );
        // Act & Assert
        expect(getByText('Get Directions')).toBeTruthy();
    });
});