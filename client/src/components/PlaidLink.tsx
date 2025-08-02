import { useState, useCallback } from "react";
import { usePlaidLink } from 'react-plaid-link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlaidLinkToken, usePlaidExchange } from "@/hooks/usePlaid";
import { 
  CheckCircle, 
  Loader2,
  Shield,
  Lock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlaidLinkProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function PlaidLink({ children, onSuccess }: PlaidLinkProps) {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  // Fetch link token from backend
  const { data: linkTokenData, isLoading: isTokenLoading, error: tokenError } = usePlaidLinkToken();
  
  // Exchange token mutation
  const exchangeMutation = usePlaidExchange();

  const onPlaidSuccess = useCallback((public_token: string, metadata: any) => {
    setIsConnected(true);
    
    // Exchange the public token
    exchangeMutation.mutate(
      { public_token, metadata },
      {
        onSuccess: () => {
          onSuccess?.();
          // Reset state after a delay
          setTimeout(() => {
            setIsConnected(false);
          }, 2000);
        },
        onError: () => {
          setIsConnected(false);
        },
      }
    );
  }, [exchangeMutation, onSuccess]);

  const onPlaidExit = useCallback((err: any, metadata: any) => {
    if (err) {
      toast({
        title: "Connection cancelled",
        description: "Bank account connection was cancelled.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const { open, ready } = usePlaidLink({
    token: linkTokenData?.link_token || null,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  });

  const handleClick = () => {
    if (tokenError) {
      toast({
        title: "Connection error",
        description: "Failed to initialize bank connection. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (ready && linkTokenData?.link_token) {
      open();
    }
  };

  const isLoading = isTokenLoading || exchangeMutation.isPending;
  const showError = tokenError && !isTokenLoading;

  if (isConnected) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div>
          <h3 className="font-medium text-lg">Account Connected!</h3>
          <p className="text-sm text-muted-foreground">
            Your bank account has been successfully linked
          </p>
        </div>
        <Badge variant="secondary" className="bg-success/10 text-success">
          Transactions will sync automatically
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Security Notice */}
      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-medium text-primary">Bank-level security</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Your data is encrypted and we never store your banking credentials
        </p>
      </div>

      {/* Error State */}
      {showError && (
        <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="font-medium text-destructive">Connection Error</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Failed to initialize bank connection. Please try again.
          </p>
        </div>
      )}

      {/* Connect Button */}
      <div onClick={handleClick} className="cursor-pointer" role="button" tabIndex={0}>
        {children}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isTokenLoading ? 'Initializing connection...' : 'Connecting account...'}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        This demo uses mock data. Real Plaid integration requires backend setup.
      </p>
    </div>
  );
}