import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { RouteData } from "@app/services/directionsService";
import { TransportationMode } from "@app/types/transportation";
import { hasNoCoordinates } from "@app/utils/indoorMapUtils";
import {
  SEGMENT_COLORS,
  MODE_LABELS,
  MODE_INFO_COLORS,
} from "@constants/transportStyles";

interface StoryOutdoorMapProps {
  readonly route: RouteData;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly transportMode?: TransportationMode;
}

function computeRegion(coords: { latitude: number; longitude: number }[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  coords.forEach((c) => {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLng) minLng = c.longitude;
    if (c.longitude > maxLng) maxLng = c.longitude;
  });
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.003),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.003),
  };
}

function RoutePolylines({
  route,
  transportMode,
}: {
  readonly route: RouteData;
  readonly transportMode: TransportationMode;
}) {
  if (transportMode === "walk") {
    return (
      <Polyline
        coordinates={route.coordinates}
        strokeWidth={4}
        strokeColor="#3B82F6"
        lineDashPattern={[8, 6]}
        testID="story-outdoor-polyline"
      />
    );
  }

  if (transportMode === "car") {
    return (
      <Polyline
        coordinates={route.coordinates}
        strokeWidth={5}
        strokeColor="#F59E0B"
        testID="story-outdoor-polyline"
      />
    );
  }

  if (transportMode === "transit") {
    if (route.segments && route.segments.length > 0) {
      return (
        <>
          {route.segments.map((seg, i) => {
            const isWalk = seg.mode === "WALK";
            const color = SEGMENT_COLORS[seg.mode];
            return (
              <Polyline
                key={`transit-seg-${seg.mode}-${i}`}
                coordinates={seg.coordinates}
                strokeWidth={isWalk ? 3 : 5}
                strokeColor={color}
                lineDashPattern={isWalk ? [6, 5] : undefined}
                testID={i === 0 ? "story-outdoor-polyline" : undefined}
              />
            );
          })}
        </>
      );
    }
    return (
      <Polyline
        coordinates={route.coordinates}
        strokeWidth={4}
        strokeColor="#8B5CF6"
        lineDashPattern={[16, 8]}
        testID="story-outdoor-polyline"
      />
    );
  }

  if (transportMode === "shuttle") {
    if (route.segments && route.segments.length > 0) {
      return (
        <>
          {route.segments.map((seg, i) => {
            const isShuttle = seg.mode === "SHUTTLE";
            return (
              <Polyline
                key={`shuttle-seg-${seg.mode}-${i}`}
                coordinates={seg.coordinates}
                strokeWidth={isShuttle ? 5 : 3}
                strokeColor={isShuttle ? "#EC4899" : "#F97316"}
                lineDashPattern={isShuttle ? undefined : [8, 6]}
                testID={i === 0 ? "story-outdoor-polyline" : undefined}
              />
            );
          })}
        </>
      );
    }
    return (
      <Polyline
        coordinates={route.coordinates}
        strokeWidth={5}
        strokeColor="#EC4899"
        testID="story-outdoor-polyline"
      />
    );
  }

  return null;
}

export default function StoryOutdoorMap({
  route,
  startLabel,
  endLabel,
  transportMode = "walk",
}: StoryOutdoorMapProps) {
  const coords = route?.coordinates;
  const region = useMemo(
    () => (coords && !hasNoCoordinates(coords) ? computeRegion(coords) : null),
    [coords],
  );

  if (!coords || !region) return null;

  const startCoord = coords[0];
  const endCoord = coords.at(-1);
  const infoColor = MODE_INFO_COLORS[transportMode];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        testID="story-outdoor-map"
      >
        <RoutePolylines route={route} transportMode={transportMode} />
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
      <View style={[styles.infoBar, { borderTopColor: infoColor }]}>
        <Text style={[styles.infoText, { color: infoColor }]}>
          {MODE_LABELS[transportMode]}: {route.duration} ({route.distance})
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
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 2,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
