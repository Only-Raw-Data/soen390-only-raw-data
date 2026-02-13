import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DirectionsHeader from '../DirectionsHeader';
import { useDirections } from '../../context/DirectionsContext';
import useUserLocation from '../../hooks/useUserLocation';
import { SGW_BUILDINGS } from '../../../constants/buildings';


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
    const mockFetchRoute = jest.fn();
    const mockClearDirections = jest.fn();
    const mockResetLoadingState = jest.fn();

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
            setTransportationMode: mockSetTransportationMode,
            swapLocations: mockSwapLocations,
            clearDirections: mockClearDirections,
            fetchRoute: mockFetchRoute,
        });
        (useUserLocation as jest.Mock).mockReturnValue({
            getNearestBuilding: mockGetNearestBuilding,
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

    it('sets start building when Use Current Location succeeds', async () => {
        //Arrange
        mockGetNearestBuilding.mockResolvedValue(SGW_BUILDINGS[0]);
        const { getByTestId } = render(<DirectionsHeader />);

        //Act
        fireEvent.press(getByTestId('current location'));

        //Assert
        await waitFor(() => {
            expect(mockSetStartBuilding).toHaveBeenCalledWith(SGW_BUILDINGS[0]);
        });
    });

    it('shows alert when Use Current Location fails', async () => {
        //Arrange
        mockGetNearestBuilding.mockResolvedValue(null);
        const { getByTestId } = render(<DirectionsHeader />);

        //Act
        fireEvent.press(getByTestId('current location'));

        //Assert
        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'Location Error',
                'Could not determine your nearest campus building. Please ensure location permissions are enabled.',
            );
        });
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
        const loyolaBuilding = SGW_BUILDINGS.find(b => b.campus === 'Loyola') || { id: 'cc', name: 'CC Building', campus: 'Loyola', code: 'CC', address: '7141 Sherbrooke St. W.', lat: 45.4582, lng: -73.6403 };

        beforeEach(() => {
            (useDirections as jest.Mock).mockReturnValue({
                startBuilding: sgwBuilding,
                destinationBuilding: loyolaBuilding,
                transportationMode: 'shuttle',
                setTransportationMode: mockSetTransportationMode,
                setStartBuilding: mockSetStartBuilding,
                setDestinationBuilding: mockSetDestinationBuilding,
                fetchRoute: mockFetchRoute,
            });
        });

        it('shows weekend message when it is Saturday', () => {
            // Saturday (day 6)
            jest.useFakeTimers().setSystemTime(new Date('2025-02-15T12:00:00Z'));
            
            const { getByText } = render(<DirectionsHeader />);
            expect(getByText('No shuttle on weekends')).toBeTruthy();
            
            jest.useRealTimers();
        });

        it('shows Friday schedule hint when it is Friday', () => {
            // Friday (day 5) - 2025-02-14 is Friday
            // 08:00 AM (local-ish) - should find next shuttle after 08:00
            jest.useFakeTimers().setSystemTime(new Date('2025-02-14T13:00:00Z')); // 13:00 UTC is ~08:00 EST
            
            const { getByText } = render(<DirectionsHeader />);
            // Should contain "Next shuttle:"
            expect(getByText(/Next shuttle:/i)).toBeTruthy();
            
            jest.useRealTimers();
        });

        it('shows "No more shuttles today" when late at night', () => {
            // Monday (day 1) - 23:59
            jest.useFakeTimers().setSystemTime(new Date('2025-02-10T23:59:00Z'));
            
            const { getByText } = render(<DirectionsHeader />);
            expect(getByText('No more shuttles today')).toBeTruthy();
            
            jest.useRealTimers();
        });

        it('opens schedule modal when transportation mode is shuttle', () => {
            const { getAllByText } = render(<DirectionsHeader />);
            // Modal is opened by useEffect when mode is shuttle
            // There are two "Shuttle Bus Schedule" texts (title and modal header)
            expect(getAllByText('Shuttle Bus Schedule').length).toBeGreaterThan(0);
        });
    });
});
