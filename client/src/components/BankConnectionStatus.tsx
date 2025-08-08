import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlaidLink } from "@/components/PlaidLink";
import { useBankAccounts } from "@/hooks/usePlaid";
import { 
  Building2, 
  PlusCircle, 
  RefreshCw, 
  Unlink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/useToast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function BankConnectionStatus() {
  const { toast } = useToast();
  const { data: bankAccounts, isLoading, refetch, error } = useBankAccounts();
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Accounts refreshed",
        description: "Bank account information has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to refresh account data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSyncTransactions = async (itemId: string, institutionName: string) => {
    setSyncingAccountId(itemId);
    try {
      // Call your backend sync endpoint
      const response = await fetch(`/api/plaid/sync/${itemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();
      
      toast({
        title: "Sync complete",
        description: `${result.transaction_count || 0} transactions synced for ${institutionName}`,
      });
      
      // Refresh the accounts data
      await refetch();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: `Unable to sync transactions for ${institutionName}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDisconnect = async (itemId: string, institutionName: string) => {
    try {
      // Call your backend remove endpoint
      const response = await fetch(`/api/plaid/remove/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Disconnect failed');
      }

      setRemovingAccountId(null);
      toast({
        title: "Account disconnected",
        description: `${institutionName} has been disconnected from your account`,
      });
      
      // Refresh the accounts data
      await refetch();
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: `Unable to disconnect ${institutionName}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'good':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'requires_update':
      case 'needs_update':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'good':
      case 'active':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'error':
      case 'failed':
        return <WifiOff className="w-3 h-3" />;
      case 'requires_update':
      case 'needs_update':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Wifi className="w-3 h-3" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'good':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'requires_update':
        return 'Needs Update';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Connected Banks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Connected Banks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Unable to load bank accounts. {error instanceof Error ? error.message : 'Please try again.'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Connected Banks
            </CardTitle>
            <CardDescription>
              Manage your connected bank accounts and sync status
            </CardDescription>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {bankAccounts && bankAccounts.accounts && bankAccounts.accounts.length > 0 ? (
          <>
            {/* Connection Health Summary */}
            {bankAccounts.accounts.some(account => account.status !== 'good') && (
              <Alert className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  {bankAccounts.accounts.filter(acc => acc.status === 'error').length > 0 && 
                    `${bankAccounts.accounts.filter(acc => acc.status === 'error').length} account(s) have connection errors. `
                  }
                  {bankAccounts.accounts.filter(acc => acc.status === 'requires_update').length > 0 && 
                    `${bankAccounts.accounts.filter(acc => acc.status === 'requires_update').length} account(s) need to be updated.`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Accounts List */}
            {bankAccounts.accounts.map((account) => (
              <div
                key={account.item_id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{account.institution_name || 'Unknown Bank'}</p>
                      <Badge 
                        variant="secondary" 
                        className={getStatusColor(account.status || 'unknown')}
                      >
                        {getStatusIcon(account.status || 'unknown')}
                        {getStatusLabel(account.status || 'unknown')}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-1">
                        {account.name} • {account.type}
                        {account.subtype && ` • ${account.subtype}`}
                      </p>
                      {account.balance !== undefined && (
                        <p className="text-sm font-medium">
                          Balance: ${account.balance.toFixed(2)}
                        </p>
                      )}
                      {account.last_synced_at && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Last synced {formatDistanceToNow(new Date(account.last_synced_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sync Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncTransactions(account.item_id!, account.institution_name!)}
                    disabled={syncingAccountId === account.item_id}
                    className="h-8"
                    title="Sync transactions"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingAccountId === account.item_id ? 'animate-spin' : ''}`} />
                  </Button>

                  {/* Account Details Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{account.institution_name} - Account Details</DialogTitle>
                        <DialogDescription>
                          Detailed information about your connected account
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Institution</Label>
                            <p className="text-sm">{account.institution_name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Status</Label>
                            <Badge className={getStatusColor(account.status || 'unknown')} variant="secondary">
                              {getStatusLabel(account.status || 'unknown')}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Account Name</Label>
                            <p className="text-sm">{account.name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Account Type</Label>
                            <p className="text-sm">{account.type} {account.subtype && `• ${account.subtype}`}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Balance</Label>
                            <p className="text-sm font-medium">
                              {account.balance !== undefined ? `$${account.balance.toFixed(2)}` : 'Not available'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Last Synced</Label>
                            <p className="text-sm">
                              {account.last_synced_at 
                                ? format(new Date(account.last_synced_at), 'PPp')
                                : 'Never'
                              }
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Account ID</Label>
                          <p className="text-xs font-mono text-muted-foreground">{account.account_id}</p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Item ID</Label>
                          <p className="text-xs font-mono text-muted-foreground">{account.item_id}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Disconnect Button */}
                  <Dialog open={removingAccountId === account.item_id} onOpenChange={(open) => !open && setRemovingAccountId(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRemovingAccountId(account.item_id!)}
                        className="h-8 text-destructive hover:text-destructive"
                        title="Disconnect account"
                      >
                        <Unlink className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Disconnect {account.institution_name}?</DialogTitle>
                        <DialogDescription>
                          This will remove the connection to your {account.institution_name} account. 
                          Your transaction history will be preserved, but new transactions will not be synced.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setRemovingAccountId(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => handleDisconnect(account.item_id!, account.institution_name!)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
            
            {/* Add Another Account */}
            <div className="pt-4 border-t">
              <PlaidLink onSuccess={() => refetch()}>
                <Button variant="outline" className="w-full">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Connect Another Bank
                </Button>
              </PlaidLink>
            </div>
          </>
        ) : (
          /* No Accounts Connected */
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">No Banks Connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect your bank account to automatically track transactions and manage your finances
              </p>
            </div>
            <PlaidLink onSuccess={() => refetch()}>
              <Button variant="financial">
                <PlusCircle className="w-4 h-4 mr-2" />
                Connect Bank Account
              </Button>
            </PlaidLink>
          </div>
        )}
      </CardContent>
    </Card>
  );
}