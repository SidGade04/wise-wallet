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
  userId: string;
  name: string;
  balance: number;
  type: 'checking' | 'savings' | 'credit';
  lastSynced: Date;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
  color: string;
}