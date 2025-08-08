import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Authenticated fetch helper
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token')
  
  if (!token) {
    throw new Error('No authentication token available')
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

// Plaid Link Token Hook
export const usePlaidLinkToken = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['plaid', 'link-token', user?.id],
    queryFn: () => authenticatedFetch('/plaid/create_link_token', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user?.id,
        client_name: 'Wise Wallet'
      })
    }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Exchange Public Token Hook
export const usePlaidExchange = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ public_token, metadata }: { public_token: string; metadata: any }) =>
      authenticatedFetch('/plaid/exchange_public_token', {
        method: 'POST',
        body: JSON.stringify({
          public_token,
          metadata
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid'] })
    },
  })
}

// Get Bank Accounts Hook
export const useBankAccounts = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['plaid', 'accounts', user?.id],
    queryFn: () => authenticatedFetch(`/plaid/accounts/user/${user?.id}`),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get User Transactions Hook
export const useAllUserTransactions = (days: number = 90) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['plaid', 'user-transactions', user?.id, days],
    queryFn: () => authenticatedFetch(`/plaid/user_transactions/${user?.id}?days=${days}`),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
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

export const useSyncTransactions = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => authenticatedFetch(`/plaid/sync/${itemId}`, {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid'] })
    },
  })
}

// Remove Account Hook  
export const useRemoveAccount = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => authenticatedFetch(`/plaid/remove/${itemId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plaid'] })
    },
  })
}