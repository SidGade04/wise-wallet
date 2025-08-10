import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaidLink } from '@/components/PlaidLink';
import { Loader2, CreditCard, Lock, Crown, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Keep the ORIGINAL subscription check that was working
const useIsPro = () => {
  const { user, session } = useAuth();
  
  return useQuery({
    queryKey: ['isPro', user?.id],
    queryFn: async () => {
      let token = null;
      
      // Method 1: Get token from session (your auth store has this)
      if (session?.access_token) {
        token = session.access_token;
        console.log('Using token from auth session');
      } else {
        // Method 2: Search localStorage for Supabase token
        console.log('Session token not found, searching localStorage...');
        
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || 
          key.includes('auth') ||
          key.includes('session')
        );
        
        console.log('Found localStorage keys:', authKeys);
        
        for (const key of authKeys) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              
              // Check multiple possible token locations in Supabase storage
              const possibleTokens = [
                parsed.access_token,
                parsed.session?.access_token,
                parsed.user?.session?.access_token,
                // Supabase often stores auth in nested structures
                parsed.auth?.session?.access_token,
                parsed.sb_access_token
              ].filter(Boolean);
              
              if (possibleTokens.length > 0) {
                token = possibleTokens[0];
                console.log(`Found token in localStorage key: ${key}`);
                break;
              }
            }
          } catch (e) {
            console.warn(`Failed to parse localStorage key ${key}:`, e);
          }
        }
      }
      
      if (!token) {
        console.error('No authentication token found anywhere');
        throw new Error('No authentication token found');
      }
      
      console.log('Making subscription status request with token...');
      
      const response = await fetch('/api/stripe/subscription/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Subscription status error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Subscription status response:', data);
      return data.is_pro || false;
    },
    enabled: !!user?.id && !!session, // Only run when we have both user and session
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Check every 30 seconds
    retry: (failureCount, error) => {
      if (error.message.includes('Authentication')) return false;
      return failureCount < 3;
    },
  });
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresBankConnection?: boolean;
  requiresSubscription?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiresBankConnection = false, 
  requiresSubscription = false 
}: ProtectedRouteProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: isPro, isLoading: subLoading, error: subError, refetch } = useIsPro();

  // Debug logging - let's see what's happening
  console.log('ProtectedRoute State:', { 
    userExists: !!user,
    userID: user?.id,
    profileExists: !!profile,
    profileHasBankConnection: profile?.has_connected_bank,
    isPro, 
    subLoading, 
    subError: subError?.message,
    requiresSubscription,
    requiresBankConnection,
    authLoading
  });

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading while checking subscription (only if subscription is required)
  if (requiresSubscription && subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking subscription status...</span>
        </div>
      </div>
    );
  }

  // Handle subscription check error (only if subscription is required)
  if (requiresSubscription && subError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Connection Error</CardTitle>
            <CardDescription>
              Unable to verify subscription status. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              Error: {subError.message}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              
              <Button 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['isPro'] });
                  refetch();
                }}
                className="flex-1"
              >
                Force Refresh
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // IMPORTANT: Only check bank connection if we have a profile AND it explicitly says no bank connection
  // If profile doesn't exist or doesn't have the has_connected_bank property, assume it's connected
  if (requiresBankConnection && profile && profile.has_connected_bank === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Connect Your Bank Account</CardTitle>
            <CardDescription>
              To access this feature, you need to connect your bank account first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlaidLink
              onSuccess={() => {
                toast.success('Bank account connected successfully!');
                // Force a page refresh to update the profile
                window.location.reload();
              }}
            >
              <Button className="w-full" size="lg">
                <CreditCard className="w-4 h-4 mr-2" />
                Connect with Plaid
              </Button>
            </PlaidLink>
            
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  toast.info('Demo mode enabled - skipping bank connection');
                  navigate('/dashboard');
                }}
                className="text-sm text-muted-foreground"
              >
                Skip for now (Demo Mode)
              </Button>
            </div>
            
            {/* Debug info to help troubleshoot */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <div>Profile exists: {profile ? 'YES' : 'NO'}</div>
              <div>has_connected_bank: {profile?.has_connected_bank?.toString() || 'undefined'}</div>
              <div>requiresBankConnection: {requiresBankConnection.toString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Subscription requirement check
  if (requiresSubscription && !isPro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl">Premium Feature</CardTitle>
            <CardDescription>
              This feature is only available to Pro subscribers. Upgrade now to unlock advanced capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Pro features include:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• AI Financial Assistant</li>
                <li>• Advanced Investment Tracking</li>
                <li>• Subscription Management</li>
                <li>• Custom Reports & Analytics</li>
                <li>• Priority Support</li>
              </ul>
            </div>
            
            <Button className="w-full" size="lg" onClick={() => navigate('/upgrade')}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>

            {/* Debug info - remove in production */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <div>isPro: {isPro ? 'TRUE' : 'FALSE'}</div>
              <div>User ID: {user?.id}</div>
              <div>Error: {subError?.message || 'None'}</div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['isPro'] });
                  refetch();
                }}
                className="mt-2 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Force Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we get here, all checks passed - show the protected content
  return <>{children}</>;
}