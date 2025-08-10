import { useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useAuthToken = () => {
  const { session } = useAuth();
  
  const getToken = useCallback(async (): Promise<string> => {
    // Try current session first
    if (session?.access_token) {
      return session.access_token;
    }
    
    // Get fresh session from Supabase
    const { data: { session: freshSession }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      throw new Error('Failed to get authentication session');
    }
    
    if (freshSession?.access_token) {
      return freshSession.access_token;
    }
    
    throw new Error('No valid authentication token available');
  }, [session]);
  
  return { getToken };
};