import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaidLink } from '@/components/PlaidLink';
import { Loader2, CreditCard, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresBankConnection?: boolean;
}

export function ProtectedRoute({ children, requiresBankConnection = false }: ProtectedRouteProps) {
  const { user, profile, isLoading, isInitialized, initialize, updateBankConnection } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Show loading spinner while auth is initializing
  if (!isInitialized || isLoading) {
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

  // If bank connection is required but user hasn't connected
  if (requiresBankConnection && profile && !profile.has_connected_bank) {
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
                // Simulate successful Plaid connection
                updateBankConnection(true);
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
                onClick={() => updateBankConnection(true)}
                className="text-sm text-muted-foreground"
              >
                Skip for now (Demo Mode)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show locked screen while profile is loading
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4" />
          <span>Setting up your account...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}