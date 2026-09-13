import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors } from '../theme/colors';
export default function ScreenFrame({ children, bottom = false }: { children: React.ReactNode; bottom?: boolean }) {
  const progress = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 280, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]));
  return <SafeAreaView edges={bottom ? ['left', 'right', 'bottom'] : ['left', 'right']} style={styles.outer}>
    <View style={styles.width}><Animated.View style={[styles.fill, { opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View></View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background },
  width: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }, fill: { flex: 1 },
});
