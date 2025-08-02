import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaidLink } from "@/components/PlaidLink";
import { useBankAccounts } from "@/hooks/usePlaid";
import { 
  Building2, 
  PlusCircle, 
  RefreshCw, 
  Unlink,
  Clock,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function BankConnectionStatus() {
  const { data: bankAccounts, isLoading, refetch } = useBankAccounts();

  const handleRefresh = () => {
    refetch();
  };

  const handleDisconnect = (accountId: string) => {
    // This would be handled by your FastAPI backend
    console.log('Disconnect account:', accountId);
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
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Connected Banks
        </CardTitle>
        <CardDescription>
          Manage your connected bank accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {bankAccounts && bankAccounts.length > 0 ? (
          <>
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{account.institution_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.account_name} • {account.account_type}
                    </p>
                    {account.last_synced_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        Last synced {formatDistanceToNow(new Date(account.last_synced_at), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="h-8"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(account.id)}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Unlink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            
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
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">No Banks Connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect your bank account to automatically track transactions
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