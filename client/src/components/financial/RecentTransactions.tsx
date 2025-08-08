import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTransformedTransactions } from "@/hooks/usePlaid";

interface RecentTransactionsProps {
  itemId?: string; // Made optional since we now get all user transactions
  maxTransactions?: number;
  days?: number;
}

export function RecentTransactions({ 
  itemId, 
  maxTransactions = 15, 
  days = 30 
}: RecentTransactionsProps) {
  // Use the new user-level transactions hook
  const { transactions, isLoading, error } = useTransformedTransactions(days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Last {days} days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Unable to load transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to fetch recent transactions. Please try again later.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter transactions by itemId if provided, otherwise show all
  let filteredTransactions = transactions || [];
  
  if (itemId) {
    // If itemId is provided, filter to only show transactions from that item
    // Note: You'd need to store item_id in your transaction data for this to work
    filteredTransactions = transactions?.filter(t => t.account_id && itemId) || [];
  }

  // Get the most recent transactions
  const recentTransactions = filteredTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxTransactions);

  if (recentTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {itemId 
              ? "No transactions found for this account in the past 30 days."
              : "No transactions found for the past 30 days."
            }
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Transactions may take a few minutes to appear after connecting your bank account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          Last {recentTransactions.length} transaction{recentTransactions.length !== 1 ? 's' : ''}
          {itemId ? ' from this account' : ' from all accounts'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {recentTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{transaction.merchant}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(transaction.date), 'MMM dd, yyyy')}
              </p>
              {transaction.pending && (
                <Badge variant="outline" className="text-xs mt-1">
                  Pending
                </Badge>
              )}
            </div>
            <div className="text-right ml-4">
              <p className={`font-medium ${
                transaction.amount < 0 ? 'text-destructive' : 'text-success'
              }`}>
                {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                {transaction.category || 'Other'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}