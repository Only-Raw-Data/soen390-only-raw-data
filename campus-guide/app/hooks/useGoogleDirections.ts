import { decode } from "@googlemaps/polyline-codec";
import { useState, useEffect } from "react";
import { Building } from "@/constants/buildings";
import { TransportationMode } from "../types/transportation";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as String
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

export function useGoogleDirection(
    start: Building,
    destination: Building,
    mode: TransportationMode
) {
    const [isLoading, setLoading] = useState<boolean>(false)

    if (!start || !destination || mode === "shuttle") {
        // ----------------- ERROR VALIDATION -----------------
    }

    const req_transport_mode = "DRIVE" // MODIFY FOR ALTERNATE TRANSPORT MODES

    const request_body = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": 0,
                    "longitude": 0
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": 0,
                    "longitude": 0
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
}