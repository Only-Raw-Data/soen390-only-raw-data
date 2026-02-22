import React, { useCallback } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import BottomNav from "@/app/components/BottomNav";
import { Screen } from "@/app/types/Screen";

import DirectionsProvider from "@/app/context/DirectionsContext";
import IndoorMapProvider from "@/app/context/IndoorMapContext";

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
    if (pathname.includes("index")) return "map";
    if (pathname.includes("two")) return "directions";
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
        case "indoor":
          router.push("/(tabs)/indoor");
          break;
        case "schedule":
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
    <IndoorMapProvider>
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
      </Tabs>
    </IndoorMapProvider>
    </DirectionsProvider>
  );
}
