import { CURRENCY_SYMBOL, MONTH_NAMES } from '../constants';

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${CURRENCY_SYMBOL}${rounded.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
