import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Crown, Loader2, Check, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCheckoutSession } from '@/hooks/useSubscription';


// Declare Stripe type
declare global {
  interface Window {
    Stripe: any;
  }
}

// Stripe checkout function that works with your auth store
const createCheckoutSession = async (plan: string, authSession: any) => {
  let token = null;
  
  // Get token from your auth session
  if (authSession?.access_token) {
    token = authSession.access_token;
  } else {
    // Fallback to localStorage search
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    
    for (const key of supabaseKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed.access_token || parsed.session?.access_token) {
            token = parsed.access_token || parsed.session.access_token;
            break;
          }
        }
      } catch (e) {
        // Continue searching
      }
    }
  }
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Checkout session error:', errorText);
    throw new Error('Failed to create checkout session');
  }

  return response.json();
};

const UpgradePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session } = useAuth(); // Get both user and session
  const [loading, setLoading] = useState<string | null>(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const createCheckoutSession = useCreateCheckoutSession();

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const sessionId = searchParams.get('session_id');

  // Load Stripe script
  useEffect(() => {
    const loadStripe = async () => {
      // Check if Stripe is already loaded
      if (window.Stripe) {
        setStripeLoaded(true);
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Stripe script loaded');
        setStripeLoaded(true);
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Stripe script');
        toast.error('Failed to load payment system');
      };

      document.head.appendChild(script);
    };

    loadStripe();
  }, []);

  useEffect(() => {
    if (success === 'true' && sessionId && user) {
      // Payment was successful
      console.log('🎉 Payment successful, invalidating cache...');
      
      // Invalidate and refetch subscription status
      queryClient.invalidateQueries({ queryKey: ['isPro', user.id] });
      
      // Show success message
      toast.success('🎉 Welcome to Pro!', {
        description: 'Your payment was successful. You now have access to all premium features!',
        duration: 6000,
      });

      // Redirect to AI Assistant after a short delay
      setTimeout(() => {
        navigate('/assistant', { replace: true });
      }, 2000);
    }

    if (canceled === 'true') {
      toast.error('Payment canceled', {
        description: 'Your payment was canceled. You can try again anytime.',
      });
    }
  }, [success, canceled, sessionId, user, queryClient, navigate]);

  const handleUpgrade = async (plan: string) => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    if (!stripeLoaded) {
      toast.error('Payment system is still loading, please try again');
      return;
    }

    if (!window.Stripe) {
      toast.error('Payment system not available');
      return;
    }

    try {
      console.log('Creating checkout session for plan:', plan);
      const data = await createCheckoutSession.mutateAsync({ plan });
      
      // Get Stripe publishable key from environment
      const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      
      if (!stripePublishableKey) {
        throw new Error('Stripe publishable key not configured');
      }
      
      // Initialize Stripe
      const stripe = window.Stripe(stripePublishableKey);
      
      if (!stripe) {
        throw new Error('Failed to initialize Stripe');
      }
      
      console.log('Redirecting to Stripe checkout...');
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      
      if (error) {
        console.error('Stripe redirect error:', error);
        toast.error(`Payment error: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout process');
    }
  };

  // Payment success screen
  if (success === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Payment Successful! 🎉</CardTitle>
            <CardDescription className="text-base">
              Welcome to Pro! Your account has been upgraded and you now have access to all premium features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold mb-3 text-green-800 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                You now have access to:
              </h4>
              <ul className="space-y-2">
                {[
                  'AI Financial Assistant',
                  'Advanced Investment Tracking', 
                  'Subscription Management',
                  'Custom Reports & Analytics',
                  'Priority Support'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-green-700">
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                size="lg" 
                onClick={() => navigate('/assistant')}
              >
                <Crown className="w-4 h-4 mr-2" />
                Try AI Assistant Now
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Redirecting to AI Assistant in a moment...
              </p>
              <Loader2 className="w-4 h-4 animate-spin mx-auto mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main upgrade page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Upgrade to Pro
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock advanced features and take control of your financial future with AI-powered insights.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <Card className="relative overflow-hidden border-2 hover:border-blue-300 transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">Pro Monthly</CardTitle>
              <div className="text-4xl font-bold text-blue-600 mt-4">
                $9.99
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </div>
              <CardDescription>Perfect for getting started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  'AI Financial Assistant',
                  'Advanced Investment Tracking',
                  'Subscription Management', 
                  'Custom Reports & Analytics',
                  'Priority Support',
                  'Cancel anytime'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                size="lg"
                onClick={() => handleUpgrade('pro_monthly')}
                disabled={loading === 'pro_monthly' || !stripeLoaded}
              >
                {loading === 'pro_monthly' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : !stripeLoaded ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Crown className="w-4 h-4 mr-2" />
                )}
                {!stripeLoaded ? 'Loading...' : 'Choose Monthly'}
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="relative overflow-hidden border-2 border-purple-300 hover:border-purple-400 transition-all duration-300">
            <div className="absolute top-4 right-4">
              <Badge className="bg-purple-600 text-white">
                Save 20%
              </Badge>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">Pro Yearly</CardTitle>
              <div className="text-4xl font-bold text-purple-600 mt-4">
                $99.99
                <span className="text-base font-normal text-muted-foreground">/year</span>
              </div>
              <CardDescription>
                <span className="line-through text-muted-foreground">$119.88</span>
                <span className="ml-2 text-green-600 font-medium">Save $19.89!</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  'Everything in Monthly',
                  'Priority AI responses',
                  'Advanced analytics',
                  'Export capabilities',
                  'Phone support',
                  '2 months free'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                size="lg"
                onClick={() => handleUpgrade('pro_yearly')}
                disabled={loading === 'pro_yearly'}
              >
                {loading === 'pro_yearly' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Crown className="w-4 h-4 mr-2" />
                )}
                Choose Yearly
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-muted-foreground">We accept all major credit cards and debit cards through Stripe's secure payment processing.</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-semibold mb-2">Is my data secure?</h4>
              <p className="text-muted-foreground">Absolutely. We use bank-level encryption and never store your banking credentials. All data is encrypted and securely stored.</p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-12">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;