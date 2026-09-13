import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorView({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button mode="contained" onPress={onRetry} style={styles.button} buttonColor={colors.primary}>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.lg,
    borderRadius: 12,
  },
});
