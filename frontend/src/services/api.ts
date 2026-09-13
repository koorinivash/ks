import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../constants/config';
import {
  DashboardSummary,
  MonthlyRecord,
  MonthlyReport,
  Person,
  PersonWithStats,
} from '../types';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export function getFriendlyErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ detail?: string }>;
    if (!err.response) {
      return 'Unable to connect to KS server.\n\nPlease check your internet connection and try again.';
    }
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return detail;
    if (err.response.status === 404) return 'The requested item was not found.';
    if (err.response.status === 422) return 'Please check the information you entered.';
    return 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

// ---------- People ----------

export interface PersonPayload {
  name: string;
  phone?: string | null;
  default_monthly_amount?: number;
  count?: number;
  status?: 'active' | 'inactive';
}

export async function fetchPeople(params?: {
  search?: string;
  status?: string;
  month?: number;
  year?: number;
}): Promise<PersonWithStats[]> {
  const { data } = await api.get<PersonWithStats[]>('/api/people', { params });
  return data;
}

export async function fetchPerson(id: string): Promise<PersonWithStats> {
  const { data } = await api.get<PersonWithStats>(`/api/people/${id}`);
  return data;
}

export async function createPerson(payload: PersonPayload): Promise<Person> {
  const { data } = await api.post<Person>('/api/people', payload);
  return data;
}

export async function updatePerson(id: string, payload: Partial<PersonPayload>): Promise<Person> {
  const { data } = await api.put<Person>(`/api/people/${id}`, payload);
  return data;
}

export async function deletePerson(id: string): Promise<void> {
  await api.delete(`/api/people/${id}`);
}

// ---------- Monthly Records ----------

export interface MonthlyRecordPayload {
  person_id: string;
  month: number;
  year: number;
  amount: number;
  paid_amount: number;
  status?: 'paid' | 'pending' | 'partial';
  payment_date?: string | null;
  notes?: string | null;
}

export async function fetchMonthlyRecords(params?: {
  person_id?: string;
  month?: number;
  year?: number;
  status?: string;
}): Promise<MonthlyRecord[]> {
  const { data } = await api.get<MonthlyRecord[]>('/api/monthly-records', { params });
  return data;
}

export async function fetchMonthlyRecord(id: string): Promise<MonthlyRecord> {
  const { data } = await api.get<MonthlyRecord>(`/api/monthly-records/${id}`);
  return data;
}

export async function createMonthlyRecord(payload: MonthlyRecordPayload): Promise<MonthlyRecord> {
  const { data } = await api.post<MonthlyRecord>('/api/monthly-records', payload);
  return data;
}

export async function updateMonthlyRecord(
  id: string,
  payload: Partial<MonthlyRecordPayload>
): Promise<MonthlyRecord> {
  const { data } = await api.put<MonthlyRecord>(`/api/monthly-records/${id}`, payload);
  return data;
}

export async function deleteMonthlyRecord(id: string): Promise<void> {
  await api.delete(`/api/monthly-records/${id}`);
}

// ---------- Dashboard & Reports ----------

export async function fetchDashboard(month: number, year: number): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/api/dashboard', { params: { month, year } });
  return data;
}

export async function fetchMonthlyReport(month: number, year: number): Promise<MonthlyReport> {
  const { data } = await api.get<MonthlyReport>('/api/reports/monthly', { params: { month, year } });
  return data;
}

export function getExcelReportUrl(month: number, year: number): string {
  return `${API_BASE_URL}/api/reports/monthly/excel?month=${month}&year=${year}`;
}

export function getPdfReportUrl(month: number, year: number): string {
  return `${API_BASE_URL}/api/reports/monthly/pdf?month=${month}&year=${year}`;
}

export function getFullExcelReportUrl(): string {
  return `${API_BASE_URL}/api/reports/full/excel`;
}

export function getFullPdfReportUrl(): string {
  return `${API_BASE_URL}/api/reports/full/pdf`;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const { data } = await api.get('/health', { timeout: 5000 });
    return data?.status === 'ok';
  } catch {
    return false;
  }
}
