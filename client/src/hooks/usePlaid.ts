// hooks/usePlaid.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Types
interface LinkTokenResponse {
  link_token: string;
  expiration: string;
}

interface ExchangeTokenRequest {
  public_token: string;
  metadata?: any;
}

interface ExchangeTokenResponse {
  access_token: string;
  item_id: string;
  message: string;
}

interface Account {
  account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balance: number;
}

interface Transaction {
  transaction_id: string;  
  account_id: string;
  amount: number;
  date: string;
  name: string;
  category: string[];
}

// Configuration - Handle environment variables safely
const getEnvVar = (name: string, defaultValue: string) => {
  if (typeof window !== 'undefined') {
    // Browser environment - check if vite or create-react-app
    return (window as any).__ENV__?.[name] || 
           (import.meta?.env?.[name]) || 
           defaultValue;
  }
  return defaultValue;
};

const API_BASE_URL = getEnvVar('REACT_APP_API_URL', 'http://127.0.0.1:8000/api/plaid');

// API functions
const plaidApi = {
  createLinkToken: async (userId: string): Promise<LinkTokenResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/create_link_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          client_name: 'Wise Wallet App'
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(error.detail || `HTTP ${response.status}: Failed to create link token`);
      }

      return await response.json();
    } catch (error) {
      console.error('createLinkToken error:', error);
      throw error instanceof Error ? error : new Error('Failed to create link token');
    }
  },

  exchangePublicToken: async (data: ExchangeTokenRequest): Promise<ExchangeTokenResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/exchange_public_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token: data.public_token
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(error.detail || `HTTP ${response.status}: Failed to exchange public token`);
      }

      return await response.json();
    } catch (error) {
      console.error('exchangePublicToken error:', error);
      throw error instanceof Error ? error : new Error('Failed to exchange public token');
    }
  },

  // Fetch bank accounts for a given Plaid item. The server returns
  // an object with an ``accounts`` array, but callers expect just the
  // array of ``Account`` objects. Previously this function forwarded the
  // entire response which resulted in consumers treating the returned
  // object like an array (calling ``map``/``length`` directly) and
  // causing runtime errors. Instead, return only the accounts array
  // while defaulting to an empty list when the response structure is
  // unexpected.
  getAccounts: async (itemId: string): Promise<Account[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/${itemId}`);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: 'Network error' }));
        throw new Error(
          error.detail || `HTTP ${response.status}: Failed to fetch accounts`,
        );
      }

      const data = await response.json();
      return data.accounts ?? [];
    } catch (error) {
      console.error('getAccounts error:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to fetch accounts');
    }
  },

  getTransactions: async (itemId: string, days: number = 30): Promise<{ transactions: Transaction[], total_transactions: number }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${itemId}?days=${days}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(error.detail || `HTTP ${response.status}: Failed to fetch transactions`);
      }

      return await response.json();
    } catch (error) {
      console.error('getTransactions error:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch transactions');
    }
  },

  getAllItems: async (): Promise<{ items: string[] }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/items`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(error.detail || `HTTP ${response.status}: Failed to fetch items`);
      }

      return await response.json();
    } catch (error) {
      console.error('getAllItems error:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch items');
    }
  }
};

// Custom hooks
export function usePlaidLinkToken(userId?: string) {
  return useQuery({
    queryKey: ['plaid-link-token', userId],
    queryFn: () => plaidApi.createLinkToken(userId || `user_${Date.now()}`),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function usePlaidExchange() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: plaidApi.exchangePublicToken,
    onSuccess: (data) => {
      // Store the item_id in localStorage for later use
      localStorage.setItem('plaid_item_id', data.item_id);
      localStorage.setItem('plaid_access_token', data.access_token);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['plaid-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['plaid-items'] });

      toast({
        title: "Bank Connected Successfully!",
        description: "Your bank account has been linked to Wise Wallet.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePlaidAccounts(itemId?: string) {
  const storedItemId = localStorage.getItem('plaid_item_id');
  const finalItemId = itemId || storedItemId;

  return useQuery({
    queryKey: ['plaid-accounts', finalItemId],
    queryFn: () => plaidApi.getAccounts(finalItemId!),
    enabled: !!finalItemId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Alias for backward compatibility
export const useBankAccounts = usePlaidAccounts;

export function usePlaidTransactions(itemId?: string, days: number = 30) {
  const storedItemId = localStorage.getItem('plaid_item_id');
  const finalItemId = itemId || storedItemId;

  return useQuery({
    queryKey: ['plaid-transactions', finalItemId, days],
    queryFn: () => plaidApi.getTransactions(finalItemId!, days),
    enabled: !!finalItemId,  
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Alias for backward compatibility  
export const useBankTransactions = usePlaidTransactions;

export function usePlaidItems() {
  return useQuery({
    queryKey: ['plaid-items'],
    queryFn: plaidApi.getAllItems,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Helper hook to check if user has connected bank
export function useHasConnectedBank() {
  const { data: items } = usePlaidItems();
  const storedItemId = localStorage.getItem('plaid_item_id');
  
  return {
    hasConnectedBank: !!(items?.items?.length || storedItemId),
    itemId: storedItemId,
  };
}