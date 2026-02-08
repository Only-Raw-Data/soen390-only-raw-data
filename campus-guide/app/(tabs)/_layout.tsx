import React, { useCallback } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import BottomNav from "../components/BottomNav";
import { Screen } from "../types/Screen";

import DirectionsProvider from "../context/DirectionsContext";

// TabBar component moved outside to prevent recreation on each render
function TabBar({
  currentScreen,
  onScreenChange,
}: {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
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
    if (pathname.includes("index")) return "map";
    if (pathname.includes("two")) return "directions";
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
        case "indoor":
        case "poi":
          router.push("/(tabs)");
          break;
      }
    },
    [router],
  );

  const currentScreen = getCurrentScreen();

  return (
    <DirectionsProvider>
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
      </Tabs>
    </DirectionsProvider>
  );
}
