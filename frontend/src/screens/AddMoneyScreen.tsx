import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, HelperText, Menu, Snackbar, TextInput } from 'react-native-paper';

import LoadingView from '../components/LoadingView';
import ErrorView from '../components/ErrorView';
import { RootStackParamList } from '../navigation/types';
import {
  createMonthlyRecord,
  fetchMonthlyRecord,
  fetchMonthlyRecords,
  fetchPersonOptions,
  getFriendlyErrorMessage,
  updateMonthlyRecord,
} from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MonthlyRecord, PersonOption } from '../types';
import { formatDate, formatMonthYear } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddMoney'>;
type Rt = RouteProp<RootStackParamList, 'AddMoney'>;

export default function AddMoneyScreen() {
  const navigation = useNavigation<Nav>();
  const headerHeight = useHeaderHeight();
  const route = useRoute<Rt>();
  const params = route.params ?? {};

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [personId, setPersonId] = useState<string | undefined>(params.personId);
  const [personMenuVisible, setPersonMenuVisible] = useState(false);

  const [today] = useState(() => {
    const now = new Date();
    // Store the local calendar day explicitly; converting local midnight to UTC can change it.
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:00:00.000Z`;
  });
  const [paymentDate, setPaymentDate] = useState<string | null>(today);
  const [month, setMonth] = useState(params.month ?? Number(today.slice(5, 7)));
  const [year, setYear] = useState(params.year ?? Number(today.slice(0, 4)));

  const [paidAmount, setPaidAmount] = useState('');
  const [existingRecordId, setExistingRecordId] = useState<string | undefined>(params.recordId);

  const [amountError, setAmountError] = useState('');
  const [personError, setPersonError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const selectedPerson = useMemo(() => people.find((p) => p.id === personId), [people, personId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingInitial(true);
    setLoadError(null);
    (async () => {
      try {
        const [peopleData, record] = await Promise.all([
          fetchPersonOptions(),
          params.recordId ? fetchMonthlyRecord(params.recordId) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setPeople(peopleData);

        if (record) {
          applyRecord(record);
        }
      } catch (err) {
        if (!cancelled) setLoadError(getFriendlyErrorMessage(err));
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.recordId, loadAttempt]);

  function applyRecord(record: MonthlyRecord) {
    setExistingRecordId(record.id);
    setPersonId(record.person_id);
    setPaidAmount(String(record.paid_amount));
    setMonth(record.month);
    setYear(record.year);
    setPaymentDate(record.payment_date);
  }

  // When (re)selecting a person, look up whether a record already exists for
  // that person this month so saving updates it instead of creating a duplicate.
  useEffect(() => {
    if (params.recordId || !personId) return;
    let cancelled = false;
    setCheckingExisting(true);
    setLoadError(null);
    setExistingRecordId(undefined);
    setPaidAmount('');
    setPaymentDate(today);
    (async () => {
      try {
        const records = await fetchMonthlyRecords({ person_id: personId, month, year });
        if (cancelled) return;
        if (records.length > 0) {
          setExistingRecordId(records[0].id);
          setPaidAmount(String(records[0].paid_amount));
          setPaymentDate(records[0].payment_date);
        } else {
          setExistingRecordId(undefined);
          setPaymentDate(today);
        }
      } catch (err) {
        if (!cancelled) setLoadError(getFriendlyErrorMessage(err));
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, params.recordId, month, year, today, loadAttempt]);

  const handleSelectPerson = (person: PersonOption) => {
    if (person.id !== personId) {
      setCheckingExisting(true);
      setExistingRecordId(undefined);
      setPaidAmount('');
      setPaymentDate(today);
    }
    setPersonId(person.id);
    setPersonMenuVisible(false);
    setPersonError('');
  };

  const validate = (): boolean => {
    let valid = true;
    if (!personId) {
      setPersonError('Please select a person');
      valid = false;
    } else {
      setPersonError('');
    }
    const paid = Number(paidAmount);
    if (paidAmount.trim() === '' || !Number.isFinite(paid) || paid < 0) {
      setAmountError('Enter a valid amount (0 or more)');
      valid = false;
    } else {
      setAmountError('');
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (loadingInitial || checkingExisting || loadError || submitting) return;
    if (!validate() || !personId) return;
    setSubmitting(true);
    try {
      const paid = Number(paidAmount) || 0;
      const payload = {
        person_id: personId,
        month,
        year,
        amount: paid,
        paid_amount: paid,
        payment_date: paymentDate,
      };
      if (existingRecordId) {
        await updateMonthlyRecord(existingRecordId, payload);
      } else {
        await createMonthlyRecord(payload);
      }
      navigation.goBack();
    } catch (err) {
      setSnackbar(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) return <LoadingView />;
  if (loadError) return <ErrorView message={loadError} onRetry={() => setLoadAttempt((attempt) => attempt + 1)} />;

  return (
    <KeyboardAvoidingView style={styles.flex} keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>{existingRecordId ? 'Edit Payment' : 'Add Payment'}</Text>

        {!params.personId && !params.recordId && (
          <Field label="Person">
            <Menu
              visible={personMenuVisible}
              onDismiss={() => setPersonMenuVisible(false)}
              anchor={
                <TextInput
                  mode="outlined"
                  placeholder="Select Person"
                  value={selectedPerson?.name ?? ''}
                  editable={false}
                  disabled={submitting}
                  onPressIn={() => setPersonMenuVisible(true)}
                  right={<TextInput.Icon icon="chevron-down" onPress={() => setPersonMenuVisible(true)} />}
                  error={Boolean(personError)}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />
              }
            >
              {people.map((p) => (
                <Menu.Item key={p.id} title={p.name} onPress={() => handleSelectPerson(p)} />
              ))}
            </Menu>
            <HelperText type="error" visible={Boolean(personError)}>
              {personError}
            </HelperText>
          </Field>
        )}

        {selectedPerson && (
          <View style={styles.personBanner}>
            <Text style={styles.personBannerName}>{selectedPerson.name}</Text>
          </View>
        )}

        <Field label="Payment Date">
          <TextInput
            mode="outlined"
            value={formatDate(paymentDate)}
            editable={false}
            left={<TextInput.Icon icon="calendar" />}
            outlineColor={colors.border}
          />
          <HelperText type="info">For {formatMonthYear(month, year)}</HelperText>
        </Field>

        <Field label="Amount">
          <TextInput
            mode="outlined"
            placeholder="1000"
            value={paidAmount}
            editable={!checkingExisting && !submitting}
            onChangeText={setPaidAmount}
            keyboardType="numeric"
            left={<TextInput.Affix text="₹" />}
            error={Boolean(amountError)}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
          />
          <HelperText type="error" visible={Boolean(amountError)}>
            {amountError}
          </HelperText>
        </Field>

        {existingRecordId && !params.recordId && (
          <Text style={styles.updateNote}>
            A payment already exists for this month — saving will update it.
          </Text>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting || checkingExisting}
          disabled={submitting || checkingExisting}
          buttonColor={colors.primary}
          style={styles.submitButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          Save Payment
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar('')} duration={4000}>
        {snackbar}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.sm },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  personBanner: {
    backgroundColor: colors.infoLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  personBannerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  updateNote: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.lg,
    borderRadius: 14,
  },
});
