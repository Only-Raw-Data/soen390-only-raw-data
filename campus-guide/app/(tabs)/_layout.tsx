import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { BottomNav } from '../components/BottomNav';
import { Screen } from '../types/Screen';

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // Map pathname to screen type
  const getCurrentScreen = (): Screen => {
    if (pathname.includes('index')) return 'map';
    if (pathname.includes('two')) return 'directions';
    return 'map';
  };

  const handleScreenChange = (screen: Screen) => {
    // For now, we'll map screens to existing routes
    // You can create more routes later for each screen type
    switch (screen) {
      case 'map':
        router.push('/(tabs)');
        break;
      case 'directions':
        router.push('/(tabs)/two');
        break;
      case 'schedule':
      case 'indoor':
      case 'poi':
        // These can navigate to the same routes for now
        // or you can create new screen files for each
        router.push('/(tabs)');
        break;
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
      }}
      tabBar={(props) => (
        <BottomNav
          currentScreen={getCurrentScreen()}
          onScreenChange={handleScreenChange}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Campus Guide',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Directions',
        }}
      />
    </Tabs>
  );
}
