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
  // Read the calendar portion directly so UTC offsets cannot move the date.
  const calendarDate = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = calendarDate
    ? new Date(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3]))
    : new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  if (calendarDate && (
    date.getFullYear() !== Number(calendarDate[1]) ||
    date.getMonth() + 1 !== Number(calendarDate[2]) ||
    date.getDate() !== Number(calendarDate[3])
  )) return '—';
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${String(date.getDate()).padStart(2, '0')} ${month} ${date.getFullYear()}`;
}
