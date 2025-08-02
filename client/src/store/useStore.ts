import { create } from 'zustand';
import { User, Transaction, Subscription, BankAccount } from '@/types';
import { mockTransactions, mockSubscriptions, mockUser } from '@/data/mockData';

interface AppState {
  user: User | null;
  transactions: Transaction[];
  subscriptions: Subscription[];
  bankAccounts: BankAccount[];
  isLoading: boolean;
  
  // Actions
  setUser: (user: User) => void;
  logout: () => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  linkBankAccount: (account: BankAccount) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: mockUser,
  transactions: mockTransactions,
  subscriptions: mockSubscriptions,
  bankAccounts: [],
  isLoading: false,

  setUser: (user) => set({ user }),
  
  logout: () => set({ 
    user: null, 
    transactions: [], 
    subscriptions: [], 
    bankAccounts: [] 
  }),

  updateTransaction: (id, updates) => set((state) => ({
    transactions: state.transactions.map(t => 
      t.id === id ? { ...t, ...updates } : t
    )
  })),

  updateSubscription: (id, updates) => set((state) => ({
    subscriptions: state.subscriptions.map(s => 
      s.id === id ? { ...s, ...updates } : s
    )
  })),

  linkBankAccount: (account) => set((state) => ({
    bankAccounts: [...state.bankAccounts, account]
  }))
}));