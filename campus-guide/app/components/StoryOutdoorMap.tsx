import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { RouteData } from "../services/directionsService";

interface StoryOutdoorMapProps {
  route: RouteData;
  startLabel: string;
  endLabel: string;
}

export default function StoryOutdoorMap({
  route,
  startLabel,
  endLabel,
}: StoryOutdoorMapProps) {
  const coords = route.coordinates;
  if (coords.length === 0) return null;

  const startCoord = coords[0];
  const endCoord = coords[coords.length - 1];

  // Compute region to fit the route
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const c of coords) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLng) minLng = c.longitude;
    if (c.longitude > maxLng) maxLng = c.longitude;
  }
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * 1.5, 0.003);
  const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.003);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        testID="story-outdoor-map"
      >
        <Polyline
          coordinates={coords}
          strokeColor="#3B82F6"
          strokeWidth={4}
          lineDashPattern={[8, 6]}
          testID="story-outdoor-polyline"
        />
        <Marker
          coordinate={startCoord}
          title={startLabel}
          pinColor="green"
          testID="story-outdoor-start-marker"
        />
        <Marker
          coordinate={endCoord}
          title={endLabel}
          pinColor="red"
          testID="story-outdoor-end-marker"
        />
      </MapView>
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          Walking: {route.duration} ({route.distance})
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoBar: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#BFDBFE",
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    textAlign: "center",
  },
});
