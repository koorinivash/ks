import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { PersonWithStats } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/format';

interface Props {
  person: PersonWithStats;
  month: number;
  year: number;
  onPress: () => void;
}

export default function PersonCard({ person, month, year, onPress }: Props) {
  const paidThisMonth = person.current_month_paid ?? 0;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
        </Text>
        <Text style={styles.subtext}>Count: {person.count}</Text>
        <Text style={styles.subtext}>{formatMonthYear(month, year)}</Text>
      </View>
      <Text style={styles.paidAmount}>{paidThisMonth > 0 ? formatCurrency(paidThisMonth) : '—'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paidAmount: {
    maxWidth: '45%',
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '700',
    color: colors.success,
  },
});
