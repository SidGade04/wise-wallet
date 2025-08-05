import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePlaidTransactions } from "@/hooks/usePlaid";

interface RecentTransactionsProps {
  itemId: string;
}

export function RecentTransactions({ itemId }: RecentTransactionsProps) {
  const { data, isLoading, error } = usePlaidTransactions(itemId, 30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
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
        </CardContent>
      </Card>
    );
  }

  const recentTransactions = data?.transactions?.slice(0, 15) || [];

  if (recentTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No transactions found for the past 30 days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Last {recentTransactions.length} transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {recentTransactions.map((transaction) => (
          <div
            key={transaction.transaction_id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{transaction.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(transaction.date), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className={`font-medium ${
                transaction.amount > 0 ? 'text-destructive' : 'text-success'
              }`}>
                {transaction.amount > 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
              </p>
              <Badge variant="secondary" className="text-xs mt-1">
                {transaction.category?.[0] || 'Other'}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}