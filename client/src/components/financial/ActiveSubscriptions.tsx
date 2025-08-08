import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransformedTransactions } from "@/hooks/usePlaid";

interface ActiveSubscriptionsProps {
  itemId?: string; // Made optional
  days?: number;
}

interface Subscription {
  name: string;
  amount: number;
  lastPayment: Date;
  frequency: string;
  count: number;
}

export function ActiveSubscriptions({ itemId, days = 90 }: ActiveSubscriptionsProps) {
  const { transactions, isLoading, error } = useTransformedTransactions(days);

  const subscriptions = useMemo(() => {
    if (!transactions?.length) return [];

    // Filter by itemId if provided
    let filteredTransactions = transactions;
    if (itemId) {
      filteredTransactions = transactions.filter(t => t.account_id && itemId);
    }

    // Group transactions by merchant name
    const merchantGroups = filteredTransactions
      .filter(t => t.amount < 0) // Only expenses
      .reduce((acc: Record<string, typeof filteredTransactions[0][]>, transaction) => {
        const name = transaction.merchant.toLowerCase().trim();
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(transaction);
        return acc;
      }, {} as Record<string, typeof filteredTransactions[0][]>);

    // Detect recurring payments (2+ transactions with similar amounts)
    const potentialSubscriptions: Subscription[] = [];

    Object.entries(merchantGroups).forEach(([name, txsRaw]) => {
      const txs = txsRaw as typeof filteredTransactions;
      if (txs.length >= 2) {
        // Sort by date
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Check if amounts are similar (within $5)
        const amounts = txs.map(t => Math.abs(t.amount));
        const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const isRecurring = amounts.every(amt => Math.abs(amt - avgAmount) <= 5);

        if (isRecurring) {
          // Calculate frequency based on date intervals
          const dateDiffs = [];
          for (let i = 1; i < txs.length; i++) {
            const diff = Math.abs(
              new Date(txs[i-1].date).getTime() - 
              new Date(txs[i].date).getTime()
            ) / (1000 * 60 * 60 * 24); // days
            dateDiffs.push(diff);
          }
          
          const avgDiff = dateDiffs.reduce((sum, diff) => sum + diff, 0) / dateDiffs.length;
          let frequency = 'Unknown';
          
          if (avgDiff >= 28 && avgDiff <= 35) frequency = 'Monthly';
          else if (avgDiff >= 6 && avgDiff <= 8) frequency = 'Weekly';
          else if (avgDiff >= 85 && avgDiff <= 95) frequency = 'Quarterly';
          else if (avgDiff >= 360 && avgDiff <= 370) frequency = 'Yearly';

          if (frequency !== 'Unknown') {
            potentialSubscriptions.push({
              name: txs[0].merchant,
              amount: avgAmount,
              lastPayment: new Date(txs[0].date),
              frequency,
              count: txs.length
            });
          }
        }
      }
    });

    return potentialSubscriptions
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [transactions, itemId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>Detected recurring payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>Detected recurring payments</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error 
              ? 'Unable to detect subscriptions' 
              : 'No recurring payments detected. Connect more accounts or wait for more transaction data.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Subscriptions</CardTitle>
        <CardDescription>
          {subscriptions.length} recurring payment{subscriptions.length !== 1 ? 's' : ''} detected
          {itemId ? ' for this account' : ' across all accounts'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {subscriptions.map((subscription, index) => (
            <div 
              key={index}
              className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium truncate flex-1">{subscription.name}</h4>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {subscription.frequency}
                </Badge>
              </div>
              <p className="text-lg font-semibold text-primary">
                ${subscription.amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Last: {format(subscription.lastPayment, 'MMM dd')}
              </p>
              <p className="text-xs text-muted-foreground">
                {subscription.count} payments detected
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}