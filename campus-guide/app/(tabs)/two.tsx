import React from 'react';
import { StyleSheet, View } from 'react-native';
import Header from '../components/Header';
import { DirectionsHeader } from '../components/DirectionsHeader';

export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <Header />
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
