import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@app/types/Screen";

interface BottomNavProps {
  readonly currentScreen: Screen;
  readonly onScreenChange: (screen: Screen) => void;
}

export default function BottomNav({ currentScreen, onScreenChange }: BottomNavProps) {
  const navItems = [
    { id: "map" as Screen, icon: "map-outline" as const, label: "Map" },
    {
      id: "directions" as Screen,
      icon: "navigate-outline" as const,
      label: "Directions",
    },
    {
      id: "schedule" as Screen,
      icon: "calendar-outline" as const,
      label: "Schedule",
    },
    {
      id: "indoor" as Screen,
      icon: "business-outline" as const,
      label: "Indoor",
    },
    { id: "poi" as Screen, icon: "location-outline" as const, label: "POI" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navContainer}>
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          const color = isActive ? "#912338" : "#6B7280";

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onScreenChange(item.id)}
              style={styles.navItem}
            >
              <Ionicons
                name={
                  isActive
                    ? (item.icon.replace("-outline", "") as any)
                    : item.icon
                }
                size={24}
                color={color}
              />
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 64,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});
