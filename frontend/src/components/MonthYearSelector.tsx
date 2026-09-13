import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { formatMonthYear } from '../utils/format';

interface Props {
  month: number;
  year: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function MonthYearSelector({ month, year, onPrevious, onNext }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous month" onPress={onPrevious} style={styles.arrow} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.label}>{formatMonthYear(month, year)}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next month" onPress={onNext} style={styles.arrow} hitSlop={10}>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    gap: 8,
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    flexShrink: 1,
    textAlign: 'center',
  },
});
