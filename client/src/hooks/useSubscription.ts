import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useAuthToken } from './useAuthToken';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Authenticated fetch helper using the unified auth token
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
};

// Main subscription hook - replaces all other subscription hooks
export const useSubscription = () => {
  const { user } = useAuth();
  const { getToken } = useAuthToken();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => authenticatedFetch('/stripe/subscription/status', {}, getToken),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.message.includes('Authentication') || error.message.includes('No valid')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    isPro: data?.is_pro || false,
    subscriptionStatus: data?.subscription_status || null,
    currentPeriodEnd: data?.current_period_end || null,
    isLoading,
    error,
    refetch
  };
};

// Create checkout session hook
export const useCreateCheckoutSession = () => {
  const { getToken } = useAuthToken();

  return useMutation({
    mutationFn: ({ plan }: { plan: string }) =>
      authenticatedFetch('/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan })
      }, getToken),
    onError: (error) => {
      console.error('Checkout session creation failed:', error);
    },
  });
};

// Refresh subscription status
export const useRefreshSubscription = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getToken } = useAuthToken();

  return useMutation({
    mutationFn: () => authenticatedFetch('/stripe/subscription/status', {}, getToken),
    onSuccess: (data) => {
      // Update the subscription status cache
      queryClient.setQueryData(['subscription', user?.id], data);
      // Also invalidate to trigger refetch for other components
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
};

// Simple hook for components that just need to check if user is pro
export const useIsPro = () => {
  const { isPro, isLoading } = useSubscription();
  return { isPro, isLoading };
};

// Hook for subscription sync (for use in main App component)
export const useSubscriptionSync = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPro, isLoading, refetch } = useSubscription();

  // Auto-refresh subscription when user auth state changes
  const refreshWhenUserChanges = () => {
    if (user && !authLoading) {
      refetch();
    }
  };

  return {
    isPro,
    isLoading: isLoading || authLoading,
    refreshWhenUserChanges,
    refetch
  };
};