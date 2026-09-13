import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
export default function BrandLogo({ size = 48 }: { size?: number }) {
  return <View style={[styles.frame, { width: size, height: size, borderRadius: size / 3 }]}>
    <Image source={require('../../assets/KS.jpeg')} accessibilityLabel="KS logo" resizeMode="contain" style={styles.image} />
  </View>;
}
const styles = StyleSheet.create({
  frame: { backgroundColor: '#050505', borderWidth: 1, borderColor: colors.primaryDark, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
