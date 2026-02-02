import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DirectionsHeader } from '../components/DirectionsHeader';

export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <DirectionsHeader />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
});
