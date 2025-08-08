import { create } from 'zustand';

interface SubscriptionState {
  isPro: boolean;
  setPro: (value: boolean) => void;
}

export const useSubscription = create<SubscriptionState>((set) => ({
  isPro: typeof window !== 'undefined' && localStorage.getItem('isPro') === 'true',
  setPro: (value) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isPro', value ? 'true' : 'false');
    }
    set({ isPro: value });
  },
}));