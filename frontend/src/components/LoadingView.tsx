import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function LoadingView() {
  return (
    <View style={styles.container} accessibilityLabel="Loading fresh data" accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      <View style={styles.skeleton} importantForAccessibility="no-hide-descendants">
        <View style={[styles.placeholder, { width: '45%', height: 18 }]} />
        {[0, 1, 2].map((key) => <View key={key} style={styles.placeholder} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { width: '100%', paddingHorizontal: 24, marginTop: 24 },
  placeholder: { height: 64, borderRadius: 12, backgroundColor: colors.border, opacity: 0.5, marginBottom: 12 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
