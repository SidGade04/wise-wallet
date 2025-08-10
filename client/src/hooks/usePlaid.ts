import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/store/useAuth';
import { useAuthToken } from './useAuthToken';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Unified authenticated fetch helper
const authenticatedFetch = async (url: string, options: RequestInit = {}, getToken: () => Promise<string>) => {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Plaid Link Token Hook
export const usePlaidLinkToken = () => {
  const { user, loading } = useAuth();
  const { getToken } = useAuthToken();

  return useQuery({
    queryKey: ['plaid', 'link-token', user?.id],
    queryFn: () => authenticatedFetch('/plaid/create_link_token', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user?.id,
        client_name: 'Wise Wallet'
      })
    }, getToken),
    enabled: !!user?.id && !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.message.includes('Authentication') || error.message.includes('No valid')) {
        return false;
      }
      return failureCount < 3;
    },
  })
}

// Exchange Public Token Hook
export const usePlaidExchange = () => {
  const queryClient = useQueryClient();
  const { getToken } = useAuthToken();

  return useMutation({
    mutationFn: ({ public_token, metadata }: { public_token: string; metadata: any }) =>
      authenticatedFetch('/plaid/exchange_public_token', {
        method: 'POST',
        body: JSON.stringify({
          public_token,
          metadata
        })
      }, getToken),
    onSuccess: () => {
      // Invalidate all plaid-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['plaid'] })
    },
    onError: (error) => {
      console.error('Failed to exchange public token:', error);
    }
  })
}

// Get Bank Accounts Hook
export const useBankAccounts = () => {
  const { user, loading } = useAuth();
  const { getToken } = useAuthToken();

  return useQuery({
    queryKey: ['plaid', 'accounts', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      return authenticatedFetch(`/plaid/accounts/user/${user.id}`, {}, getToken);
    },
    enabled: !!user?.id && !loading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error.message.includes('Authentication') || error.message.includes('No valid')) {
        return false;
      }
      return failureCount < 3;
    },
  })
}

// Get User Transactions Hook
export const useAllUserTransactions = (days: number = 90) => {
  const { user, loading } = useAuth();
  const { getToken } = useAuthToken();

  return useQuery({
    queryKey: ['plaid', 'user-transactions', user?.id, days],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      return authenticatedFetch(`/plaid/user_transactions/${user.id}?days=${days}`, {}, getToken);
    },
    enabled: !!user?.id && !loading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error.message.includes('Authentication') || error.message.includes('No valid')) {
        return false;
      }
      return failureCount < 3;
    },
  })
}

// Transform transactions for app use
export const useTransformedTransactions = (days: number = 90) => {
  const { data, isLoading, error, refetch } = useAllUserTransactions(days)

  const transformedTransactions = (data?.transactions || []).map((plaidTx: any) => ({
    id: plaidTx.transaction_id,
    merchant: plaidTx.merchant_name || plaidTx.name,
    amount: -plaidTx.amount, // Plaid uses positive for spending, we use negative
    date: new Date(plaidTx.date),
    category: plaidTx.category?.[0] || 'Other',
    description: plaidTx.name,
    account_id: plaidTx.account_id,
    payment_channel: plaidTx.payment_channel,
    pending: plaidTx.pending,
    isRecurring: false,
  }))

  return {
    transactions: transformedTransactions,
    isLoading,
    error,
    refetch,
  }
}

// Sync Transactions Hook
export const useSyncTransactions = () => {
  const queryClient = useQueryClient();
  const { getToken } = useAuthToken();

  return useMutation({
    mutationFn: (itemId: string) => authenticatedFetch(`/plaid/sync/${itemId}`, {
      method: 'POST'
    }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid'] })
    },
    onError: (error) => {
      console.error('Failed to sync transactions:', error);
    }
  })
}

// Remove Account Hook
export const useRemoveAccount = () => {
  const queryClient = useQueryClient();
  const { getToken } = useAuthToken();

  return useMutation({
    mutationFn: (itemId: string) => authenticatedFetch(`/plaid/remove/${itemId}`, {
      method: 'DELETE'
    }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid'] })
    },
    onError: (error) => {
      console.error('Failed to remove account:', error);
    }
  })
}

// Debug hook to check authentication status
export const useAuthDebug = () => {
  const { user, session } = useAuth();
  const { getToken } = useAuthToken();
  
  return useQuery({
    queryKey: ['auth-debug'],
    queryFn: async () => {
      try {
        const token = await getToken();
        return {
          hasUser: !!user,
          hasSession: !!session,
          userId: user?.id,
          tokenAvailable: !!token,
          tokenPreview: token ? `${token.substring(0, 10)}...` : null
        };
      } catch (error) {
        return {
          hasUser: !!user,
          hasSession: !!session,
          userId: user?.id,
          tokenAvailable: false,
          error: error.message
        };
      }
    },
    enabled: true,
    refetchInterval: 30000, // Check every 30 seconds
  });
};