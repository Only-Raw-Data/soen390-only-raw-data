import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Building } from '@/constants/buildings';

export type TransportationMode = 'walk' | 'car' | 'transit' | 'shuttle';

interface DirectionsContextType {
    startBuilding: Building | null;
    destinationBuilding: Building | null;
    transportationMode: TransportationMode;
    setStartBuilding: (building: Building | null) => void;
    setDestinationBuilding: (building: Building | null) => void;
    setTransportationMode: (mode: TransportationMode) => void;
    clearDirections: () => void;
    swapLocations: () => void;
}

const DirectionsContext = createContext<DirectionsContextType | undefined>(undefined);

export function DirectionsProvider({ children }: { children: ReactNode }) {
    const [startBuilding, setStartBuilding] = useState<Building | null>(null);
    const [destinationBuilding, setDestinationBuilding] = useState<Building | null>(null);
    const [transportationMode, setTransportationMode] = useState<TransportationMode>('walk');

    const clearDirections = () => {
        setStartBuilding(null);
        setDestinationBuilding(null);
        setTransportationMode('walk');
    };

    const swapLocations = () => {
        const temp = startBuilding;
        setStartBuilding(destinationBuilding);
        setDestinationBuilding(temp);
    };

    return (
        <DirectionsContext.Provider
            value={{
                startBuilding,
                destinationBuilding,
                transportationMode,
                setStartBuilding,
                setDestinationBuilding,
                setTransportationMode,
                clearDirections,
                swapLocations,
            }}
        >
            {children}
        </DirectionsContext.Provider>
    );
}

export function useDirections() {
    const context = useContext(DirectionsContext);
    if (context === undefined) {
        throw new Error('useDirections must be used within a DirectionsProvider');
    }
    return context;
}
