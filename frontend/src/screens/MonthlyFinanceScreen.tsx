import React, { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FAB } from 'react-native-paper';

import EmptyState from '../components/EmptyState';
import ErrorView from '../components/ErrorView';
import LoadingView from '../components/LoadingView';
import MonthYearSelector from '../components/MonthYearSelector';
import { useMonthYear } from '../hooks/useMonthYear';
import { RootStackParamList } from '../navigation/types';
import { fetchMonthlyReport, getFriendlyErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { MonthlyReport, ReportRow } from '../types';
import { formatCurrency } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MonthlyFinanceScreen() {
  const navigation = useNavigation<Nav>();
  const { month, year, goToPreviousMonth, goToNextMonth } = useMonthYear();

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      const id = ++requestId.current;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const data = await fetchMonthlyReport(month, year);
        if (id !== requestId.current) return;
        setReport(data);
      } catch (err) {
        if (id === requestId.current) setError(getFriendlyErrorMessage(err));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [month, year]
  );

  useFocusEffect(
    useCallback(() => {
      load();
      return () => { requestId.current += 1; };
    }, [load])
  );

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={() => load()} />;

  const rows = report?.rows ?? [];

  return (
    <View style={styles.container}>
      <MonthYearSelector month={month} year={year} onPrevious={goToPreviousMonth} onNext={goToNextMonth} />

      <View style={styles.summaryRow}>
        <SummaryChip label="People" value={String(report?.summary.total_people ?? 0)} />
        <SummaryChip label="Collected" value={formatCurrency(report?.summary.collected_amount ?? 0)} />
      </View>

      {rows.length === 0 ? (
        <EmptyState
          icon="cash-outline"
          title="No payments recorded for this month."
          actionLabel="+ Add Payment"
          onAction={() => navigation.navigate('AddMoney', { month, year })}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.person_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item }: { item: ReportRow }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate('AddMoney', {
                  personId: item.person_id,
                  recordId: item.record_id ?? undefined,
                  month,
                  year,
                })
              }
            >
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowAmountValue}>{formatCurrency(item.paid)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        color={colors.textOnPrimary}
        onPress={() => navigation.navigate('AddMoney', { month, year })}
      />
    </View>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chipLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 104,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowName: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowAmountValue: {
    maxWidth: '50%',
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 28,
  },
});
