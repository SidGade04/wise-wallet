import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export function PaymentSuccessHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { refetch } = useSubscription();

  const success = searchParams.get('success');
  const sessionId = searchParams.get('session_id');

  // prevents duplicate handling (StrictMode, re-renders, etc.)
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (success === 'true' && sessionId && user?.id) {
      handled.current = true;

      // hard reset cache & refetch
      queryClient.removeQueries({ queryKey: ['subscription', user.id] });
      refetch();

      // dedupe toast by id
      toast.success('Payment successful! Welcome to Pro! 🎉', {
        id: 'pro-success',
        description: 'Your account has been upgraded. You now have access to all premium features.',
        duration: 5000,
      });

      // optional: quick poll to wait for webhook to finish
      const poll = async () => {
        for (let i = 0; i < 5; i++) {
          const { data } = await refetch();
          if (data?.is_pro) break;
          await new Promise(r => setTimeout(r, 1500));
        }
        // remove query params so this never runs again
        navigate('/assistant', { replace: true });
      };
      void poll();
    }
  }, [success, sessionId, user?.id, refetch, queryClient, navigate]);

  return null;
}
