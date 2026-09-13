import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconButton, Menu } from 'react-native-paper';

import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ErrorView from '../components/ErrorView';
import LoadingView from '../components/LoadingView';
import { MONTH_NAMES } from '../constants';
import { RootStackParamList } from '../navigation/types';
import {
  deleteMonthlyRecord,
  deletePerson,
  fetchMonthlyRecords,
  fetchPerson,
  getFriendlyErrorMessage,
} from '../services/api';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { MonthlyRecord, PersonWithStats } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PersonDetails'>;
type Rt = RouteProp<RootStackParamList, 'PersonDetails'>;

export default function PersonDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { personId } = route.params;

  const [person, setPerson] = useState<PersonWithStats | null>(null);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [deletePersonVisible, setDeletePersonVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [personData, recordData] = await Promise.all([
        fetchPerson(personId),
        fetchMonthlyRecords({ person_id: personId }),
      ]);
      setPerson(personData);
      setRecords(recordData);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: person?.name ?? 'Person Details',
      headerRight: () => (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item
            leadingIcon="pencil"
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('AddPerson', { personId });
            }}
            title="Edit Person"
          />
          <Menu.Item
            leadingIcon="delete"
            onPress={() => {
              setMenuVisible(false);
              setDeletePersonVisible(true);
            }}
            title="Delete Person"
          />
        </Menu>
      ),
    });
  }, [navigation, person, menuVisible, personId]);

  const handleDeletePerson = async () => {
    setDeletePersonVisible(false);
    try {
      await deletePerson(personId);
      navigation.goBack();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return;
    const id = deleteRecordId;
    setDeleteRecordId(null);
    try {
      await deleteMonthlyRecord(id);
      load();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!person) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.name}>{person.name}</Text>

            <View style={styles.statsGrid}>
              <StatBox label="Count" value={String(person.count)} />
              <StatBox label="Total Contribution" value={formatCurrency(person.total_contributed)} />
              <StatBox label="Payments Made" value={String(records.length)} />
              <StatBox label="Last Payment" value={person.last_payment_date ? formatDate(person.last_payment_date) : '—'} />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Contribution History</Text>
              <IconButton
                icon="plus-circle"
                iconColor={colors.primary}
                onPress={() => navigation.navigate('AddMoney', { personId })}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.recordRow}>
            <View style={styles.recordInfo}>
              <Text style={styles.recordDate}>
                {item.payment_date ? formatDate(item.payment_date) : `${MONTH_NAMES[item.month - 1]} ${item.year}`}
              </Text>
              <Text style={styles.recordAmount}>Paid {formatCurrency(item.paid_amount)}</Text>
              <Text style={styles.recordSub}>
                {MONTH_NAMES[item.month - 1]} {item.year}
              </Text>
            </View>
            <IconButton
              icon="pencil-outline"
              size={18}
              onPress={() =>
                navigation.navigate('AddMoney', {
                  personId,
                  recordId: item.id,
                  month: item.month,
                  year: item.year,
                })
              }
            />
            <IconButton
              icon="trash-can-outline"
              size={18}
              iconColor={colors.danger}
              onPress={() => setDeleteRecordId(item.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cash-outline"
            title="No payments recorded yet."
            subtitle="Add a payment to start tracking this person's contributions."
            actionLabel="+ Add Payment"
            onAction={() => navigation.navigate('AddMoney', { personId })}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      <ConfirmDialog
        visible={Boolean(deleteRecordId)}
        title="Delete Payment?"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        onConfirm={handleDeleteRecord}
        onDismiss={() => setDeleteRecordId(null)}
      />

      <ConfirmDialog
        visible={deletePersonVisible}
        title="Delete Person?"
        message={`Are you sure you want to delete ${person.name}? This action cannot be undone.`}
        onConfirm={handleDeletePerson}
        onDismiss={() => setDeletePersonVisible(false)}
      />
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue} numberOfLines={2} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  recordInfo: { flex: 1 },
  recordDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordAmount: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  recordSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
