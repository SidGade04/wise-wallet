import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types for app data structures
export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: Date;
  category: string;
  description?: string;
  account_id?: string;
  payment_channel?: string;
  pending?: boolean;
  isRecurring?: boolean;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: Date;
  endDate: Date;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: string;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: Date;
  lastChargeDate: Date;
  category: string;
  isActive: boolean;
}

interface StoreState {
  // Legacy data (kept for backwards compatibility but should be empty for new users)
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  subscriptions: Subscription[];
  
  // Settings and preferences
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    budgetAlerts: boolean;
    billReminders: boolean;
    goalUpdates: boolean;
    weeklyReports: boolean;
  };
  
  // Actions for managing legacy data (mostly for backwards compatibility)
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  addBudget: (budget: Omit<Budget, 'id' | 'spent'>) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  
  addGoal: (goal: Omit<Goal, 'id' | 'currentAmount'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<Pick<StoreState, 'currency' | 'dateFormat' | 'theme' | 'notifications'>>) => void;
  
  // Utility actions
  clearAllData: () => void;
  importData: (data: Partial<StoreState>) => void;
  
  // New actions for Plaid integration
  syncWithPlaid: (plaidTransactions: any[]) => void;
}

// Default settings
const defaultSettings = {
  currency: 'USD',
  dateFormat: 'MM/dd/yyyy',
  theme: 'system' as const,
  notifications: {
    budgetAlerts: true,
    billReminders: true,
    goalUpdates: true,
    weeklyReports: false,
  },
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state - empty arrays for new users
      transactions: [],
      budgets: [],
      goals: [],
      subscriptions: [],
      ...defaultSettings,

      // Transaction actions (legacy support)
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [
            ...state.transactions,
            {
              ...transaction,
              id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          ],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id ? { ...transaction, ...updates } : transaction
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((transaction) => transaction.id !== id),
        })),

      // Budget actions
      addBudget: (budget) =>
        set((state) => ({
          budgets: [
            ...state.budgets,
            {
              ...budget,
              id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              spent: 0,
            },
          ],
        })),

      updateBudget: (id, updates) =>
        set((state) => ({
          budgets: state.budgets.map((budget) =>
            budget.id === id ? { ...budget, ...updates } : budget
          ),
        })),

      deleteBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((budget) => budget.id !== id),
        })),

      // Goal actions
      addGoal: (goal) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              ...goal,
              id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              currentAmount: 0,
            },
          ],
        })),

      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id ? { ...goal, ...updates } : goal
          ),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id),
        })),

      // Subscription actions
      updateSubscription: (id, updates) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((subscription) =>
            subscription.id === id ? { ...subscription, ...updates } : subscription
          ),
        })),

      // Settings actions
      updateSettings: (settings) =>
        set((state) => ({
          ...state,
          ...settings,
        })),

      // Utility actions
      clearAllData: () =>
        set(() => ({
          transactions: [],
          budgets: [],
          goals: [],
          subscriptions: [],
          ...defaultSettings,
        })),

      importData: (data) =>
        set((state) => ({
          ...state,
          ...data,
        })),

      // New Plaid sync function
      syncWithPlaid: (plaidTransactions) => {
        // Convert Plaid transactions to app format
        const convertedTransactions: Transaction[] = plaidTransactions.map((plaidTx) => ({
          id: plaidTx.transaction_id,
          merchant: plaidTx.merchant_name || plaidTx.name,
          amount: -plaidTx.amount, // Plaid uses positive for spending, we use negative
          date: new Date(plaidTx.date),
          category: plaidTx.category?.[0] || 'Other',
          description: plaidTx.name,
          account_id: plaidTx.account_id,
          payment_channel: plaidTx.payment_channel,
          pending: plaidTx.pending,
          isRecurring: false, // Will be determined by analysis
        }));

        // Merge with existing transactions, avoiding duplicates
        set((state) => {
          const existingIds = new Set(state.transactions.map(t => t.id));
          const newTransactions = convertedTransactions.filter(t => !existingIds.has(t.id));
          
          return {
            transactions: [...state.transactions, ...newTransactions]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          };
        });
      },
    }),
    {
      name: 'wise-wallet-store',
      version: 2, // Increment version to handle migration
      migrate: (persistedState: any, version: number) => {
        // Migration logic for existing users
        if (version < 2) {
          // Clear old mock data and reset to defaults for v2
          return {
            transactions: [],
            budgets: [],
            goals: [],
            subscriptions: [],
            ...defaultSettings,
          };
        }
        return persistedState;
      },
      // Only persist settings and user-created data, not Plaid transactions
      partialize: (state) => ({
        budgets: state.budgets,
        goals: state.goals,
        subscriptions: state.subscriptions,
        currency: state.currency,
        dateFormat: state.dateFormat,
        theme: state.theme,
        notifications: state.notifications,
        // Don't persist transactions - they should come from Plaid
      }),
    }
  )
);

// Computed selectors for derived data
export const useStoreSelectors = () => {
  const store = useStore();
  
  return {
    // Active budgets
    activeBudgets: store.budgets.filter(budget => {
      const now = new Date();
      return now >= budget.startDate && now <= budget.endDate;
    }),
    
    // Active goals
    activeGoals: store.goals.filter(goal => goal.isActive),
    
    // Goal progress percentages
    goalProgress: store.goals.map(goal => ({
      ...goal,
      progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
    })),
    
    // Budget utilization
    budgetUtilization: store.budgets.map(budget => ({
      ...budget,
      utilization: budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0,
      remaining: budget.limit - budget.spent,
    })),
  };
};

// Hook for budget calculations based on real transactions
export const useBudgetCalculations = (transactions: Transaction[]) => {
  const { budgets } = useStore();
  
  return budgets.map(budget => {
    // Calculate spent amount from actual transactions
    const spent = transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        return (
          tx.category === budget.category &&
          tx.amount < 0 && // Only expenses
          txDate >= budget.startDate &&
          txDate <= budget.endDate
        );
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    return {
      ...budget,
      spent,
      remaining: budget.limit - spent,
      utilization: budget.limit > 0 ? (spent / budget.limit) * 100 : 0,
      isOverBudget: spent > budget.limit,
    };
  });
};

// Hook for goal progress based on spending patterns
export const useGoalProgress = (transactions: Transaction[]) => {
  const { goals } = useStore();
  
  return goals.map(goal => {
    // Calculate progress based on savings (income - expenses in category)
    const relevantTransactions = transactions.filter(tx => 
      tx.category === goal.category || goal.category === 'General'
    );
    
    const totalIncome = relevantTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalExpenses = relevantTransactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    // For savings goals, current amount could be net savings
    const netSavings = totalIncome - totalExpenses;
    const currentAmount = Math.max(0, netSavings); // Don't go negative
    
    return {
      ...goal,
      currentAmount,
      progress: goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0,
      projectedCompletion: goal.targetAmount > 0 && currentAmount > 0 
        ? new Date(Date.now() + ((goal.targetAmount - currentAmount) / currentAmount) * 30 * 24 * 60 * 60 * 1000)
        : null,
    };
  });
};

// Export store instance for direct access if needed
export { useStore as default };