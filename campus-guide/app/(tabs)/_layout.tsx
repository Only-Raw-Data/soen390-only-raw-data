import React, { useCallback } from "react";
import { View } from "react-native";
import { Tabs, useRouter, usePathname } from "expo-router";
import BottomNav from "@components/BottomNav";
import NextClassDirectionsBanner from "@components/NextClassDirectionsBanner";
import { Screen } from "@types/Screen";

import DirectionsProvider from "@context/DirectionsContext";
import IndoorMapProvider from "@context/IndoorMapContext";
import CalendarAuthProvider from "@context/CalendarAuthContext";
import { POIProvider } from "@context/POIContext";

// TabBar component moved outside to prevent recreation on each render
function TabBar({
  currentScreen,
  onScreenChange,
}: {
  readonly currentScreen: Screen;
  readonly onScreenChange: (screen: Screen) => void;
}) {
  return (
    <BottomNav currentScreen={currentScreen} onScreenChange={onScreenChange} />
  );
}

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Map pathname to screen type
  const getCurrentScreen = (): Screen => {
    if (pathname.includes("poi")) return "poi";
    if (pathname.includes("index")) return "map";
    if (pathname.includes("two")) return "directions";
    if (pathname.includes("schedule")) return "schedule";
    if (pathname.includes("indoor")) return "indoor";
    return "map";
  };

  const handleScreenChange = useCallback(
    (screen: Screen) => {
      switch (screen) {
        case "map":
          router.push("/(tabs)");
          break;
        case "directions":
          router.push("/(tabs)/two");
          break;
        case "schedule":
          router.push("/(tabs)/schedule");
          break;
        case "indoor":
          router.push("/(tabs)/indoor");
          break;
        case "poi":
          router.push("/(tabs)/poi");
          break;
      }
    },
    [router],
  );

  const currentScreen = getCurrentScreen();

  return (
    <DirectionsProvider>
      <IndoorMapProvider>
        <CalendarAuthProvider>
          <POIProvider>
            <View style={{ flex: 1 }}>
              <NextClassDirectionsBanner />
              <Tabs
                screenOptions={{
                  headerShown: false,
                }}
                tabBar={() => (
                  <TabBar
                    currentScreen={currentScreen}
                    onScreenChange={handleScreenChange}
                  />
                )}
              >
                <Tabs.Screen
                  name="index"
                  options={{
                    title: "Campus Guide",
                  }}
                />
                <Tabs.Screen
                  name="two"
                  options={{
                    title: "Directions",
                  }}
                />
                <Tabs.Screen
                  name="indoor"
                  options={{
                    title: "Indoor",
                  }}
                />
                <Tabs.Screen
                  name="schedule"
                  options={{
                    title: "Schedule",
                  }}
                />
                <Tabs.Screen
                  name="poi"
                  options={{
                    title: "Points of Interest",
                  }}
                />
              </Tabs>
            </View>
          </POIProvider>
        </CalendarAuthProvider>
      </IndoorMapProvider>
    </DirectionsProvider>
  );
}
