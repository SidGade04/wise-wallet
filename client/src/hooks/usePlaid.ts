import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Mock API endpoints - replace with your actual FastAPI endpoints
const API_BASE = '/api'; // Update this to your FastAPI URL

interface LinkTokenResponse {
  link_token: string;
}

interface ExchangeTokenRequest {
  public_token: string;
  metadata: any;
}

interface ExchangeTokenResponse {
  success: boolean;
  account_data: {
    institution_name: string;
    account_name: string;
    account_type: string;
  };
}

export const usePlaidLinkToken = () => {
  return useQuery({
    queryKey: ['plaid-link-token'],
    queryFn: async (): Promise<LinkTokenResponse> => {
      // For demo purposes, return a mock token
      // Replace this with actual API call to your FastAPI backend
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ link_token: 'mock-link-token-for-demo' });
        }, 1000);
      });
      
      // Actual implementation would be:
      // const response = await fetch(`${API_BASE}/plaid/link-token`);
      // if (!response.ok) throw new Error('Failed to fetch link token');
      // return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const usePlaidExchange = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ExchangeTokenRequest): Promise<ExchangeTokenResponse> => {
      // For demo purposes, return mock success
      // Replace this with actual API call to your FastAPI backend
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            account_data: {
              institution_name: 'Demo Bank',
              account_name: 'Demo Checking',
              account_type: 'checking',
            },
          });
        }, 2000);
      });

      // Actual implementation would be:
      // const response = await fetch(`${API_BASE}/plaid/exchange`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // });
      // if (!response.ok) throw new Error('Failed to exchange token');
      // return response.json();
    },
    onSuccess: async (response) => {
      // Store bank account in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          institution_name: response.account_data.institution_name,
          account_name: response.account_data.account_name,
          account_type: response.account_data.account_type,
          last_synced_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Invalidate and refetch bank accounts
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      
      toast({
        title: "Bank account connected!",
        description: `Successfully linked your ${response.account_data.institution_name} account.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useBankAccounts = () => {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async (): Promise<BankAccount[]> => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};