import React from 'react';
import { StyleSheet, View } from 'react-native';
import Header from '../components/Header';
import { ShuttleSchedule } from '../components/ShuttleSchedule';

export default function ScheduleScreen() {
  return (
    <View style={styles.container}>
      <Header />
      <ShuttleSchedule />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
});

