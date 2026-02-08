import { fetchDirections } from '../directionsService';

// Mock fetch
global.fetch = jest.fn();

describe('directionsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key';
    });

    it('fetches directions successfully using Routes API v2', async () => {
        // Arrange  
        const mockResponse = {
            routes: [{
                polyline: {
                    encodedPolyline: 'a~l~Fjk~uOnA?jxD' // Sample encoded polyline
                },
                duration: '600s',
                distanceMeters: 2500
            }]
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        // Act
        const result = await fetchDirections(
            { lat: 45.4971, lng: -73.5791 },
            { lat: 45.4953, lng: -73.5782 },
            'walk'
        );

        // Assert
        expect(result).not.toBeNull();
        expect(result?.duration).toBe('10 mins');
        expect(result?.distance).toBe('2.5 km');
        expect(result?.coordinates.length).toBeGreaterThan(0);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://routes.googleapis.com/directions/v2:computeRoutes',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'X-Goog-Api-Key': 'test-api-key',
                    'X-Goog-FieldMask': expect.any(String)
                })
            })
        );
    });

    it('handles API errors with Routes API v2', async () => {
        // Arrange
        const mockResponse = {
            error: {
                message: 'Invalid API Key'
            }
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            statusText: 'Unauthorized',
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        // Act
        const result = await fetchDirections(
            { lat: 0, lng: 0 },
            { lat: 0, lng: 0 },
            'walk'
        );

        // Assert
        expect(result).toBeNull();
    });

    it('handles network errors', async () => {
        // Arrange
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        // Act
        const result = await fetchDirections(
            { lat: 45.4971, lng: -73.5791 },
            { lat: 45.4953, lng: -73.5782 },
            'walk'
        );

        // Assert
        expect(result).toBeNull();
    });
});
