import { create } from 'zustand';
import { InvestmentHolding, InvestmentTransaction } from '@/types';

interface InvestmentsState {
  holdings: InvestmentHolding[];
  transactions: InvestmentTransaction[];
  totalValue: number;
  isLoading: boolean;
  error: string | null;
  fetchHoldings: (itemId: string, getToken: () => Promise<string>) => Promise<void>;
  fetchTransactions: (itemId: string, getToken: () => Promise<string>) => Promise<void>;
}

// Use the same API base as your other Plaid endpoints
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000/api';

export const useInvestmentsStore = create<InvestmentsState>((set, get) => ({
  holdings: [],
  transactions: [],
  totalValue: 0,
  isLoading: false,
  error: null,
  
  fetchHoldings: async (itemId: string, getToken: () => Promise<string>) => {
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      
      // Updated API URL structure to match your backend
      const res = await fetch(`${API_BASE_URL}/investments/holdings/${itemId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        // Check if it's a 404 (endpoint doesn't exist) vs other errors
        if (res.status === 404) {
          throw new Error('Investment endpoints not implemented yet');
        } else if (res.status === 500) {
          throw new Error(`Server error: Investment data unavailable`);
        } else {
          throw new Error(`Failed to fetch holdings: ${res.status} ${res.statusText}`);
        }
      }
      
      const data = await res.json();
      set({ 
        holdings: data.holdings || [], 
        totalValue: data.total_value || 0,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching holdings:', error);
      set({ 
        error: error.message || 'Failed to fetch holdings',
        isLoading: false 
      });
      throw error;
    }
  },
  
  fetchTransactions: async (itemId: string, getToken: () => Promise<string>) => {
    set({ isLoading: true, error: null });
    try {
      const token = await getToken();
      
      // Updated API URL structure to match your backend
      const res = await fetch(`${API_BASE_URL}/investments/transactions/${itemId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        // Check if it's a 404 (endpoint doesn't exist) vs other errors
        if (res.status === 404) {
          throw new Error('Investment endpoints not implemented yet');
        } else if (res.status === 500) {
          throw new Error(`Server error: Investment data unavailable`);
        } else {
          throw new Error(`Failed to fetch transactions: ${res.status} ${res.statusText}`);
        }
      }
      
      const data = await res.json();
      set({ 
        transactions: data.transactions || [],
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ 
        error: error.message || 'Failed to fetch transactions',
        isLoading: false 
      });
      throw error;
    }
  },
}));