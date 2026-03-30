import Header from '@app/components/Header';
import MapViewApp from '@app/components/MapView';
import { View } from 'react-native';
import { useScreenTimer } from '@hooks/useScreenTimer';

export default function TabOneScreen() {
  useScreenTimer('Map');

  return (
    <View style={{ flex: 1 }}>
      <Header />
      <MapViewApp
        showSearch
        enableUsabilityTaskTracking
        googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
      />
    </View>
  );
}

