import Header from '@app/components/Header';
import MapViewApp from '@app/components/MapView';
import { View } from 'react-native';

export default function TabOneScreen() {
  return  <View style={{ flex: 1 }}>
            <Header />
            <MapViewApp showSearch googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}/>
          </View>;
          
}

