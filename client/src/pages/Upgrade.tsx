import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/store/useSubscription';

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
if (!pk) {
  throw new Error(
    'Missing VITE_STRIPE_PUBLISHABLE_KEY. Add it to client/.env and restart the dev server.'
  );
}
const stripePromise = loadStripe(pk);

export default function Upgrade() {
  const location = useLocation();
  const { isPro, setPro } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const apiUrl =
    (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000/api';

  useEffect(() => {
    if (searchParams.get('success')) {
      setPro(true);
      setMessage('Payment successful. Your subscription is active.');
    } else if (searchParams.get('canceled')) {
      setMessage('Checkout canceled.');
    }
  }, [searchParams, setPro]);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const stripe = await stripePromise;
      if (!stripe) {
        setMessage('Stripe failed to initialize. Check your publishable key.');
        return;
      }

      const res = await fetch(`${apiUrl}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Prefer a logical plan key the server maps to a price id
        body: JSON.stringify({ plan: 'pro_monthly' }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to create checkout session');
      }

      const { sessionId } = await res.json();
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Something went wrong starting checkout.');
    } finally {
      setLoading(false);
    }
  };

  if (isPro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">You're subscribed!</CardTitle>
            <CardDescription>Enjoy your premium features.</CardDescription>
          </CardHeader>
          {message && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{message}</p>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Upgrade to Pro</CardTitle>
          <CardDescription>Access premium features like the AI assistant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" size="lg" onClick={handleSubscribe} disabled={loading}>
            {loading ? 'Redirecting…' : 'Subscribe'}
          </Button>
          {message && <p className="text-sm text-center text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
