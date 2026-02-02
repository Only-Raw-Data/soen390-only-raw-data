import { MapViewApp } from '../components/MapView';

export default function TabOneScreen() {
  return <MapViewApp showSearch googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}/>;
}

