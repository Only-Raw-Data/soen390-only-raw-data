import { decode } from "@googlemaps/polyline-codec";
import { useState, useEffect, useCallback } from "react";
import { Building } from "@/constants/buildings";
import { TransportationMode } from "../types/transportation";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

export function useGoogleDirection() {
    const [isLoading, setLoading] = useState<boolean>(false)

    const getDirections = useCallback(async (start: Building, destination: Building, mode: TransportationMode) => {
        if (!start || !destination || mode === "shuttle") {
            // ----------------- ERROR VALIDATION -----------------
        }

        const req_transport_mode = "DRIVE" // MODIFY FOR ALTERNATE TRANSPORT MODES

        const request_body = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": start.lat,
                        "longitude": start.lng

                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": destination.lat,
                        "longitude": destination.lng
                    }
                }
            },
            "travelMode": req_transport_mode,
            "routingPreference": "TRAFFIC_AWARE",
            "computeAlternativeRoutes": false,
            "routeModifiers": {
                "avoidTolls": false,
                "avoidHighways": false,
                "avoidFerries": false
            },
            "languageCode": "en-CA",
            "units": "METRIC"
        }

        try {
            const response = await fetch(GOOGLE_ROUTES_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "aapplication/json",
                    "X-Goog-Api-Key": GOOGLE_API_KEY,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
                },
                body: JSON.stringify(request_body),
            });

            if (!response.ok) {
                throw new Error(`Google Maps API request failed: ${response.status}`);
            }

            const routes = await response.json()
            console.log(routes)

        } catch (error) {
            console.warn("Failed to fetch Google Route:", error);
        }
    }, [])

    return {
        getDirections
    };
}