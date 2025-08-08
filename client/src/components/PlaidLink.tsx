import { useState, useCallback } from "react";
import { usePlaidLink } from 'react-plaid-link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlaidLinkToken, usePlaidExchange } from "@/hooks/usePlaid";
import { PlaidConnectionSuccess } from "./PlaidConnectionSuccess";
import { 
  CheckCircle, 
  Loader2,
  Shield,
  Lock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/store/useAuth";

interface PlaidLinkProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function PlaidLink({ children, onSuccess }: PlaidLinkProps) {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch link token from your backend
  const { 
    data: linkTokenData, 
    isLoading: isTokenLoading, 
    error: tokenError,
    refetch: refetchToken
  } = usePlaidLinkToken(user?.id || user?.email);

  // Add debugging
  console.log('PlaidLink Debug:', {
    linkTokenData,
    isTokenLoading,
    tokenError,
    userId: user?.id || user?.email
  });
  
  // Exchange token mutation
  const exchangeMutation = usePlaidExchange();

  const onPlaidSuccess = useCallback((public_token: string, metadata: any) => {
    try {
      console.log('Plaid success:', { public_token, metadata });
      setIsConnected(true);
      
      // Exchange the public token with your backend
      exchangeMutation.mutate(
        { public_token, metadata },
        {
          onSuccess: (data) => {
            console.log('Exchange success:', data);
            onSuccess?.();
            
            // Keep success state visible longer to show insights
            setTimeout(() => {
              setIsConnected(false);
            }, 30000); // 30 seconds to view insights
          },
          onError: (error) => {
            console.error('Exchange error:', error);
            setIsConnected(false);
            toast({
              title: "Connection Error",
              description: "Failed to complete bank connection. Please try again.",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error) {
      console.error('onPlaidSuccess error:', error);
      setIsConnected(false);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [exchangeMutation, onSuccess, toast]);

  const onPlaidExit = useCallback((err: any, metadata: any) => {
    try {
      console.log('Plaid exit:', { err, metadata });
      
      if (err) {
        // Log the full error for debugging
        console.error('Plaid error details:', {
          error_code: err.error_code,
          error_message: err.error_message,
          error_type: err.error_type,
          display_message: err.display_message,
          full_error: err
        });

        let errorMessage = "Bank account connection failed.";
        
        // Handle specific error types
        switch (err.error_code) {
          case 'INVALID_LINK_TOKEN':
            errorMessage = "Invalid connection token. Please try again.";
            // Refresh the token
            refetchToken();
            break;
          case 'INTERNAL_ERROR':
            errorMessage = "Internal error occurred. This might be a backend issue.";
            break;
          case 'INVALID_INSTITUTION':
            errorMessage = "Selected bank is not supported.";
            break;
          default:
            errorMessage = err.display_message || err.error_message || "Connection failed.";
        }

        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('onPlaidExit error:', error);
    }
  }, [toast, refetchToken]);

  const onPlaidEvent = useCallback((eventName: string, metadata: any) => {
    try {
      console.log('Plaid event:', eventName, metadata);
    } catch (error) {
      console.error('onPlaidEvent error:', error);
    }
  }, []);

  const { open, ready, error: plaidError } = usePlaidLink({
    token: linkTokenData?.link_token || null,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
    onEvent: onPlaidEvent,
    env: 'sandbox', // Changed to production to match your backend
    // env: 'production',
  });

  const handleClick = () => {
    console.log('handleClick called:', {
      tokenError,
      plaidError,
      ready,
      linkToken: linkTokenData?.link_token,
      tokenExists: !!linkTokenData?.link_token
    });

    if (tokenError) {
      console.error('Token error:', tokenError);
      toast({
        title: "Connection Error",
        description: `Failed to initialize bank connection: ${tokenError.message}`,
        variant: "destructive",
      });
      return;
    }

    if (plaidError) {
      console.error('Plaid error:', plaidError);
      toast({
        title: "Plaid Error",
        description: plaidError.message,
        variant: "destructive",
      });
      return;
    }
    
    if (!linkTokenData?.link_token) {
      console.error('No link token available');
      toast({
        title: "No Token",
        description: "Link token not available. Please try refreshing the page.",
        variant: "destructive",
      });
      // Try to refetch the token
      refetchToken();
      return;
    }
    
    if (ready && linkTokenData?.link_token) {
      console.log('Opening Plaid Link with token:', linkTokenData.link_token.substring(0, 20) + '...');
      open();
    } else if (!ready) {
      console.log('Plaid Link not ready yet');
      toast({
        title: "Not Ready",
        description: "Plaid Link is still loading. Please wait a moment.",
        variant: "default",
      });
    }
  };

  const isLoading = isTokenLoading || exchangeMutation.isPending;
  const showError = (tokenError || plaidError) && !isTokenLoading;

  if (isConnected && exchangeMutation.isSuccess) {
    return (
      <PlaidConnectionSuccess 
        itemId={exchangeMutation.data?.item_id}
        onContinue={() => setIsConnected(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Security Notice */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-800">Bank-level Security</span>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          Your data is encrypted and we never store your banking credentials
        </p>
      </div>

      {/* Error State */}
      {showError && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-800">Connection Error</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            {tokenError?.message || plaidError?.message || 'Failed to initialize bank connection. Please try again.'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2" 
            onClick={() => {
              console.log('Retrying token fetch...');
              refetchToken();
            }}
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Connect Button */}
      <div 
        onClick={handleClick} 
        className={`cursor-pointer ${!ready || isLoading ? 'pointer-events-none opacity-50' : ''}`}
        role="button" 
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        {children}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isTokenLoading ? 'Initializing connection...' : 'Connecting account...'}
        </div>
      )}

      {/* Development Info - Remove process.env check */}
      {import.meta?.env?.DEV && (
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Environment: sandbox</p>
          <p>Ready: {ready ? '✅' : '❌'} | Token: {linkTokenData?.link_token ? '✅' : '❌'}</p>
        </div>
      )}
    </div>
  );
}
