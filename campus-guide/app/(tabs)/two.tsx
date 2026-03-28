import React from 'react';
import { StyleSheet, View } from 'react-native';
import Header from '@app/components/Header';
import DirectionsHeader from '@app/components/DirectionsHeader';
import MapViewApp from '@app/components/MapView';
import { useScreenTimer } from '@hooks/useScreenTimer';

export default function TabTwoScreen() {
  useScreenTimer('Directions');

  return (
    <View style={styles.container}>
      <Header />
      <DirectionsHeader />
      <MapViewApp showSearch={false} googleMapsApiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
});
