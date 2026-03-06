import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DirectionsHeader from '../DirectionsHeader';
import { useDirections } from '../../context/DirectionsContext';
import useUserLocation from '../../hooks/useUserLocation';
import { LOYOLA_BUILDINGS, SGW_BUILDINGS } from '../../../constants/buildings';


jest.mock('../../context/DirectionsContext', () => ({
    useDirections: jest.fn(),
}));

jest.mock('../../hooks/useUserLocation', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('DirectionsHeader', () => {
    const mockSetTransportationMode = jest.fn();
    const mockSwapLocations = jest.fn();
    const mockSetStartBuilding = jest.fn();
    const mockSetDestinationBuilding = jest.fn();
    const mockGetNearestBuilding = jest.fn();
    const mockGetRawLocation = jest.fn();
    const mockFetchRoute = jest.fn();
    const mockClearDirections = jest.fn();
    const mockResetLoadingState = jest.fn();
    const mockSetStartCoords = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: null,
            destinationBuilding: null,
            transportationMode: 'walk',
            route: null,
            isLoadingRoute: false,
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setStartCoords: mockSetStartCoords,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
            clearDirections: mockClearDirections,
            fetchRoute: mockFetchRoute,
        });
        (useUserLocation as jest.Mock).mockReturnValue({
            getNearestBuilding: mockGetNearestBuilding,
            getRawLocation: mockGetRawLocation,
            isLoading: false,
            resetLoadingState: mockResetLoadingState,
        });
    });

    it('renders correctly with default values', () => {
        //Arrange
        const { getByPlaceholderText, getByTestId } = render(<DirectionsHeader />);

        //Assert
        expect(getByTestId('directions-title')).toBeTruthy();
        expect(getByPlaceholderText('Start location')).toBeTruthy();
        expect(getByPlaceholderText('Destination')).toBeTruthy();
    });

    it('shows selected building names', () => {
        //Arrange
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: SGW_BUILDINGS[0],
            destinationBuilding: SGW_BUILDINGS[1],
            transportationMode: 'walk',
            route: null,
            isLoadingRoute: false,
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setStartCoords: mockSetStartCoords,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
            clearDirections: mockClearDirections,
            fetchRoute: mockFetchRoute,
        });

        //Act
        const { getByDisplayValue } = render(<DirectionsHeader />);

        //Assert
        expect(getByDisplayValue(SGW_BUILDINGS[0].name)).toBeTruthy();
        expect(getByDisplayValue(SGW_BUILDINGS[1].name)).toBeTruthy();
    });

    it('calls setTransportationMode when a mode is tapped', () => {
        //Arrange
        const { getByText } = render(<DirectionsHeader />);

        //Act
        fireEvent.press(getByText('Car'));

        //Assert
        expect(mockSetTransportationMode).toHaveBeenCalledWith('car');
    });

    it('calls swapLocations when refresh icon is pressed', () => {
        //Arrange
        const { getByTestId } = render(<DirectionsHeader />);
        const swapButton = getByTestId('swap-button');

        //Act
        fireEvent.press(swapButton);

        //Assert
        expect(mockSwapLocations).toHaveBeenCalled();
    });

    it('shows search results when typing in start location', () => {
        //Arrange
        const { getByTestId, getByText } = render(<DirectionsHeader />);
        const input = getByTestId('start-input');

        //Act
        fireEvent(input, 'focus');
        fireEvent.changeText(input, 'Hall');

        //Assert
        expect(getByText('Henry F. Hall Building')).toBeTruthy();
    });

    it('renders the Use Current Location button', () => {
        //Arrange
        const { getByTestId } = render(<DirectionsHeader />);

        //Assert
        expect(getByTestId('current location')).toBeTruthy();
    });


    it('shows loading indicator while fetching location', () => {
        //Arrange
        (useUserLocation as jest.Mock).mockReturnValue({
            getNearestBuilding: mockGetNearestBuilding,
            isLoading: true,
            resetLoadingState: mockResetLoadingState,
        });

        //Act
        const { getByTestId } = render(<DirectionsHeader />);

        //Assert
        expect(getByTestId('location-loading')).toBeTruthy();
    });

    it('calls fetchRoute when Get Directions is pressed', () => {
        // Arrange
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: SGW_BUILDINGS[0],
            destinationBuilding: SGW_BUILDINGS[1],
            transportationMode: 'walk',
            route: null,
            isLoadingRoute: false,
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setStartCoords: mockSetStartCoords,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
            clearDirections: mockClearDirections,
            fetchRoute: mockFetchRoute,
        });

        const { getByTestId } = render(<DirectionsHeader />);
        
        // Act
        fireEvent.press(getByTestId('get-directions-button'));

        // Assert
        expect(mockFetchRoute).toHaveBeenCalled();
    });

    it('shows loading indicator on Get Directions button when route is loading', () => {
        // Arrange
        (useDirections as jest.Mock).mockReturnValue({
            startBuilding: SGW_BUILDINGS[0],
            destinationBuilding: SGW_BUILDINGS[1],
            transportationMode: 'walk',
            route: null,
            isLoadingRoute: true,
            setStartBuilding: mockSetStartBuilding,
            setDestinationBuilding: mockSetDestinationBuilding,
            setStartCoords: mockSetStartCoords,
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
            clearDirections: mockClearDirections,
            fetchRoute: mockFetchRoute,
        });

        const { getByTestId } = render(<DirectionsHeader />);
        
        // Assert
        expect(getByTestId('get-directions-button')).toBeTruthy();
    });

    describe('Shuttle Logic', () => {
        const sgwBuilding = SGW_BUILDINGS.find(b => b.campus === 'SGW');
        const loyolaBuilding = LOYOLA_BUILDINGS[0] || { id: 'cc', name: 'Central Building', code: 'CC', campus: 'Loyola' as const, address: '7141 Sherbrooke St. W.', lat: 45.4582, lng: -73.6403, department: '', overview: '', accessibility: '', x: 0, y: 0 };

        beforeEach(() => {
            (useDirections as jest.Mock).mockReturnValue({
                startBuilding: sgwBuilding,
                destinationBuilding: loyolaBuilding,
                transportationMode: 'shuttle',
                route: null,
                isLoadingRoute: false,
                setTransportationMode: mockSetTransportationMode,
                setStartBuilding: mockSetStartBuilding,
                setDestinationBuilding: mockSetDestinationBuilding,
                setStartCoords: mockSetStartCoords,
                swapLocations: mockSwapLocations,
                clearDirections: mockClearDirections,
                fetchRoute: mockFetchRoute,
            });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('shows direction label "Shuttle To Loyola" when start is SGW and destination is Loyola', () => {
            // Arrange & Act
            const { getByTestId } = render(<DirectionsHeader />);

            // Assert
            expect(getByTestId('shuttle-direction-label')).toBeTruthy();
            expect(getByTestId('shuttle-direction-label').props.children).toContain('To Loyola');
        });

        it('shows next shuttle text with direction on Friday', () => {
            // Arrange
            jest.useFakeTimers().setSystemTime(new Date('2025-02-14T13:00:00Z'));

            // Act
            const { getByText } = render(<DirectionsHeader />);

            // Assert
            expect(getByText(/Next shuttle To Loyola:/i)).toBeTruthy();
        });

        it('shows weekend message when it is Saturday', () => {
            // Arrange
            jest.useFakeTimers().setSystemTime(new Date('2025-02-15T12:00:00Z'));

            // Act
            const { getByText } = render(<DirectionsHeader />);

            // Assert
            expect(getByText('No shuttle on weekends')).toBeTruthy();
        });

        it('shows "No more shuttles today" when late at night', () => {
            // Arrange
            jest.useFakeTimers().setSystemTime(new Date('2025-02-10T23:59:00Z'));

            // Act
            const { getByText } = render(<DirectionsHeader />);

            // Assert
            expect(getByText('No more shuttles today')).toBeTruthy();
        });

        it('does not auto-open schedule modal when shuttle is selected', () => {
            // Arrange & Act
            const { queryByTestId } = render(<DirectionsHeader />);

            // Assert
            const modalContent = queryByTestId('close-shuttle-modal');
            expect(modalContent).toBeNull();
        });

        it('sets default start and destination when Shuttle mode is pressed', () => {
            // Arrange — start in walk mode with no buildings selected
            (useDirections as jest.Mock).mockReturnValue({
                startBuilding: null,
                destinationBuilding: null,
                transportationMode: 'walk',
                route: null,
                isLoadingRoute: false,
                setTransportationMode: mockSetTransportationMode,
                setStartBuilding: mockSetStartBuilding,
                setDestinationBuilding: mockSetDestinationBuilding,
                setStartCoords: mockSetStartCoords,
                swapLocations: mockSwapLocations,
                clearDirections: mockClearDirections,
                fetchRoute: mockFetchRoute,
            });

            const { getByText } = render(<DirectionsHeader />);

            // Act — press the Shuttle transport mode button
            fireEvent.press(getByText('Shuttle'));

            // Assert
            expect(mockSetTransportationMode).toHaveBeenCalledWith('shuttle');
            expect(mockSetStartBuilding).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'h' }),
            );
            expect(mockSetDestinationBuilding).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'fc' }),
            );
        });

        it('sets startCoords and clears startBuilding when Use Current Location succeeds', async () => {
            mockGetRawLocation.mockResolvedValue({ lat: 45.497, lng: -73.578 });
            const { getByTestId } = render(<DirectionsHeader />);
            fireEvent.press(getByTestId('current location'));
            await waitFor(() => {
                expect(mockSetStartCoords).toHaveBeenCalledWith({ lat: 45.497, lng: -73.578 });
                expect(mockSetStartBuilding).toHaveBeenCalledWith(null);
            });
        });

        it('shows alert when Use Current Location returns null', async () => {
            mockGetRawLocation.mockResolvedValue(null);
            const { getByTestId } = render(<DirectionsHeader />);
            fireEvent.press(getByTestId('current location'));
            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Location Error',
                    'Could not determine your location. Please ensure location permissions are enabled.',
                );
            });
        });

        it('selects a building from search results for start', () => {
            const { getByTestId, getByText } = render(<DirectionsHeader />);
            fireEvent(getByTestId('start-input'), 'focus');
            fireEvent.changeText(getByTestId('start-input'), 'Hall');
            fireEvent.press(getByText('Henry F. Hall Building'));
            expect(mockSetStartBuilding).toHaveBeenCalledWith(expect.objectContaining({ id: 'h' }));
            expect(mockSetStartCoords).toHaveBeenCalledWith(null);
        });

        it('selects a building from search results for destination', () => {
            const { getByTestId, getByText } = render(<DirectionsHeader />);
            fireEvent(getByTestId('dest-input'), 'focus');
            fireEvent.changeText(getByTestId('dest-input'), 'Hall');
            fireEvent.press(getByText('Henry F. Hall Building'));
            expect(mockSetDestinationBuilding).toHaveBeenCalledWith(expect.objectContaining({ id: 'h' }));
        });

        
    });
});
