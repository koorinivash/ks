export type PersonStatus = 'active' | 'inactive';
export type RecordStatus = 'paid' | 'pending' | 'partial';

export interface PersonOption {
  id: string;
  name: string;
}

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  default_monthly_amount: number;
  count: number;
  total_monthly_amount: number;
  status: PersonStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonWithStats extends Person {
  total_contributed: number;
  paid_months: number;
  pending_months: number;
  current_month_status?: RecordStatus | null;
  current_month_paid?: number;
  last_payment_date: string | null;
}

export interface MonthlyRecord {
  id: string;
  person_id: string;
  person_name?: string | null;
  month: number;
  year: number;
  amount: number;
  paid_amount: number;
  status: RecordStatus;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  has_any_people?: boolean;
  total_people: number;
  expected_amount: number;
  collected_amount: number;
  pending_amount: number;
  collection_percentage: number;
  month: number;
  year: number;
}

export interface ReportRow {
  person_id: string;
  record_id: string | null;
  name: string;
  expected: number;
  paid: number;
  balance: number;
  status: RecordStatus;
  payment_date: string | null;
}

export interface MonthlyReport {
  month: number;
  year: number;
  summary: {
    total_people: number;
    expected_amount: number;
    collected_amount: number;
    pending_amount: number;
    collection_percentage: number;
  };
  rows: ReportRow[];
}
