import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, HelperText, Menu, Snackbar, TextInput } from 'react-native-paper';

import LoadingView from '../components/LoadingView';
import { RootStackParamList } from '../navigation/types';
import {
  createMonthlyRecord,
  fetchMonthlyRecord,
  fetchMonthlyRecords,
  fetchPeople,
  getFriendlyErrorMessage,
  updateMonthlyRecord,
} from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { MonthlyRecord, PersonWithStats } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddMoney'>;
type Rt = RouteProp<RootStackParamList, 'AddMoney'>;

export default function AddMoneyScreen() {
  const navigation = useNavigation<Nav>();
  const headerHeight = useHeaderHeight();
  const route = useRoute<Rt>();
  const params = route.params ?? {};

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [people, setPeople] = useState<PersonWithStats[]>([]);
  const [personId, setPersonId] = useState<string | undefined>(params.personId);
  const [personMenuVisible, setPersonMenuVisible] = useState(false);

  const paymentDate = useMemo(() => {
    if (params.year && params.month) return new Date(params.year, params.month - 1, 1);
    return new Date();
  }, [params.year, params.month]);

  const [paidAmount, setPaidAmount] = useState('');
  const [existingRecordId, setExistingRecordId] = useState<string | undefined>(params.recordId);

  const [amountError, setAmountError] = useState('');
  const [personError, setPersonError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const selectedPerson = useMemo(() => people.find((p) => p.id === personId), [people, personId]);

  useEffect(() => {
    (async () => {
      try {
        const peopleData = await fetchPeople({ status: 'active' });
        setPeople(peopleData);

        if (params.recordId) {
          const record = await fetchMonthlyRecord(params.recordId);
          applyRecord(record);
        }
      } catch (err) {
        setSnackbar(getFriendlyErrorMessage(err));
      } finally {
        setLoadingInitial(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRecord(record: MonthlyRecord) {
    setExistingRecordId(record.id);
    setPersonId(record.person_id);
    setPaidAmount(String(record.paid_amount));
  }

  // When (re)selecting a person, look up whether a record already exists for
  // that person this month so saving updates it instead of creating a duplicate.
  useEffect(() => {
    if (params.recordId || !personId) return;
    let cancelled = false;
    setCheckingExisting(true);
    const month = paymentDate.getMonth() + 1;
    const year = paymentDate.getFullYear();
    (async () => {
      try {
        const records = await fetchMonthlyRecords({ person_id: personId, month, year });
        if (cancelled) return;
        if (records.length > 0) {
          setExistingRecordId(records[0].id);
          setPaidAmount(String(records[0].paid_amount));
        } else {
          setExistingRecordId(undefined);
        }
      } catch {
        // Non-fatal: worst case, saving may hit a duplicate-record error which is shown to the user.
      } finally {
        if (!cancelled) setCheckingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, params.recordId]);

  const handleSelectPerson = (person: PersonWithStats) => {
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
    if (paidAmount.trim() === '' || Number.isNaN(paid) || paid < 0) {
      setAmountError('Enter a valid amount (0 or more)');
      valid = false;
    } else {
      setAmountError('');
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate() || !personId) return;
    setSubmitting(true);
    try {
      const paid = Number(paidAmount) || 0;
      const payload = {
        person_id: personId,
        month: paymentDate.getMonth() + 1,
        year: paymentDate.getFullYear(),
        amount: paid,
        paid_amount: paid,
        payment_date: paymentDate.toISOString(),
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

  return (
    <KeyboardAvoidingView style={styles.flex} keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>{existingRecordId ? 'Edit Payment' : 'Add Payment'}</Text>

        {!params.personId && (
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

        <Field label="Amount">
          <TextInput
            mode="outlined"
            placeholder="1000"
            value={paidAmount}
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
