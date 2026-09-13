import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Snackbar } from 'react-native-paper';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import ErrorView from '../components/ErrorView';
import LoadingView from '../components/LoadingView';
import MonthYearSelector from '../components/MonthYearSelector';
import { useMonthYear } from '../hooks/useMonthYear';
import {
  api,
  fetchMonthlyReport,
  getExcelReportUrl,
  getFriendlyErrorMessage,
  getFullExcelReportUrl,
  getFullPdfReportUrl,
  getPdfReportUrl,
} from '../services/api';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { MonthlyReport } from '../types';
import { formatCurrency } from '../utils/format';

type ExportKey = 'month-excel' | 'month-pdf' | 'full-excel' | 'full-pdf';

export default function ReportsScreen() {
  const { month, year, goToPreviousMonth, goToNextMonth } = useMonthYear();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportKey | null>(null);
  const [snackbar, setSnackbar] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMonthlyReport(month, year);
      setReport(data);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mimeType = (isPdf: boolean) =>
    isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const downloadOnWeb = (buffer: ArrayBuffer, fileName: string, isPdf: boolean) => {
    // expo-file-system has no web implementation, so on web we fall back to a
    // standard browser Blob download instead of the native file+share flow.
    const g = globalThis as any;
    const blob = new g.Blob([buffer], { type: mimeType(isPdf) });
    const objectUrl = g.URL.createObjectURL(blob);
    const link = g.document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    g.document.body.appendChild(link);
    link.click();
    g.document.body.removeChild(link);
    g.URL.revokeObjectURL(objectUrl);
  };

  const downloadAndShare = async (key: ExportKey, url: string, fileName: string, isPdf: boolean) => {
    setExporting(key);
    try {
      const response = await api.get(url, { responseType: 'arraybuffer' });

      if (Platform.OS === 'web') {
        downloadOnWeb(response.data, fileName, isPdf);
        setSnackbar(`Downloaded ${fileName}`);
        return;
      }

      const base64 = arrayBufferToBase64(response.data);
      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(base64, { encoding: 'base64' });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: mimeType(isPdf),
          dialogTitle: `Share ${isPdf ? 'PDF' : 'Excel'} Report`,
        });
      } else {
        setSnackbar(`Report saved to ${file.uri}`);
      }
    } catch (err) {
      setSnackbar(getFriendlyErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const handleExportMonth = (type: 'excel' | 'pdf') => {
    const isPdf = type === 'pdf';
    const url = isPdf ? getPdfReportUrl(month, year) : getExcelReportUrl(month, year);
    const fileName = `KS_Report_${year}_${String(month).padStart(2, '0')}.${isPdf ? 'pdf' : 'xlsx'}`;
    downloadAndShare(isPdf ? 'month-pdf' : 'month-excel', url, fileName, isPdf);
  };

  const handleExportFull = (type: 'excel' | 'pdf') => {
    const isPdf = type === 'pdf';
    const url = isPdf ? getFullPdfReportUrl() : getFullExcelReportUrl();
    const fileName = `KS_Full_Report.${isPdf ? 'pdf' : 'xlsx'}`;
    downloadAndShare(isPdf ? 'full-pdf' : 'full-excel', url, fileName, isPdf);
  };

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  const summary = report?.summary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your reports</Text>

      <Text style={styles.label}>Select Month</Text>
      <MonthYearSelector month={month} year={year} onPrevious={goToPreviousMonth} onNext={goToNextMonth} />

      <View style={styles.summaryCard}>
        <SummaryLine label="People" value={String(summary?.total_people ?? 0)} />
        <SummaryLine label="Collected" value={formatCurrency(summary?.collected_amount ?? 0)} />
      </View>

      <Text style={styles.sectionTitle}>This Month's Report</Text>
      <Button
        mode="contained"
        icon="file-excel"
        onPress={() => handleExportMonth('excel')}
        loading={exporting === 'month-excel'}
        disabled={Boolean(exporting)}
        buttonColor={colors.primary}
        style={styles.exportButton}
        contentStyle={{ paddingVertical: 6 }}
      >
        Export Excel
      </Button>
      <Button
        mode="contained"
        icon="file-pdf-box"
        onPress={() => handleExportMonth('pdf')}
        loading={exporting === 'month-pdf'}
        disabled={Boolean(exporting)}
        buttonColor={colors.primary}
        style={styles.exportButton}
        contentStyle={{ paddingVertical: 6 }}
      >
        Export PDF
      </Button>

      <Text style={styles.sectionTitle}>Full Report (All Time)</Text>
      <Button
        mode="contained-tonal"
        icon="file-excel"
        onPress={() => handleExportFull('excel')}
        loading={exporting === 'full-excel'}
        disabled={Boolean(exporting)}
        style={styles.exportButton}
        contentStyle={{ paddingVertical: 6 }}
      >
        Download Full Excel
      </Button>
      <Button
        mode="contained-tonal"
        icon="file-pdf-box"
        onPress={() => handleExportFull('pdf')}
        loading={exporting === 'full-pdf'}
        disabled={Boolean(exporting)}
        style={styles.exportButton}
        contentStyle={{ paddingVertical: 6 }}
      >
        Download Full PDF
      </Button>

      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar('')} duration={4000}>
        {snackbar}
      </Snackbar>
    </ScrollView>
  );
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];

    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 0x03) << 4) | (b2 === undefined ? 0 : b2 >> 4)];
    result += b2 === undefined ? '=' : BASE64_CHARS[((b2 & 0x0f) << 2) | (b3 === undefined ? 0 : b3 >> 6)];
    result += b3 === undefined ? '=' : BASE64_CHARS[b3 & 0x3f];
  }
  return result;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  exportButton: {
    marginBottom: spacing.sm,
    borderRadius: 14,
  },
});
