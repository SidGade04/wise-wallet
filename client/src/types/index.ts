export interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  linkedBankAccounts: string[];
  createdAt: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  has_connected_bank: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  merchant: string;
  category: string;
  date: Date;
  description?: string;
  accountId: string;
  isRecurring?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextBillingDate: Date;
  isActive: boolean;
  category: string;
  lastChargeDate: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
  color: string;
}

export interface AIInsight {
  id: string;
  user_id: string;
  type: 'question' | 'summary';
  question: string | null;
  response: string;
  created_at: string;
}

export interface InvestmentHolding {
  security_id: string;
  account_id: string;
  ticker?: string | null;
  name?: string | null;
  quantity: number;
  price?: number | null;
  value?: number | null;
}

export interface InvestmentTransaction {
  investment_transaction_id: string;
  account_id: string;
  security_id?: string | null;
  ticker?: string | null;
  name?: string | null;
  type: string;
  date: string;
  quantity?: number | null;
  price?: number | null;
  amount: number;
  fees?: number | null;
}