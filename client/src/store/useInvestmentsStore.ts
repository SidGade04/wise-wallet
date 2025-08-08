import { create } from 'zustand';
import { InvestmentHolding, InvestmentTransaction } from '@/types';

interface InvestmentsState {
  holdings: InvestmentHolding[];
  transactions: InvestmentTransaction[];
  totalValue: number;
  fetchHoldings: (itemId: string) => Promise<void>;
  fetchTransactions: (itemId: string) => Promise<void>;
}

const getEnvVar = (name: string, defaultValue: string) => {
  if (typeof window !== 'undefined') {
    return (
      (window as any).__ENV__?.[name] ||
      (import.meta as any)?.env?.[name] ||
      defaultValue
    );
  }
  return defaultValue;
};

const API_BASE_URL = getEnvVar('REACT_APP_API_URL', 'http://127.0.0.1:8000/api/plaid');

export const useInvestmentsStore = create<InvestmentsState>((set) => ({
  holdings: [],
  transactions: [],
  totalValue: 0,
  fetchHoldings: async (itemId: string) => {
    const res = await fetch(`${API_BASE_URL}/investments/${itemId}/holdings`);
    if (!res.ok) throw new Error('Failed to fetch holdings');
    const data = await res.json();
    set({ holdings: data.holdings, totalValue: data.total_value });
  },
  fetchTransactions: async (itemId: string) => {
    const res = await fetch(`${API_BASE_URL}/investments/${itemId}/transactions`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await res.json();
    set({ transactions: data.transactions });
  },
}));