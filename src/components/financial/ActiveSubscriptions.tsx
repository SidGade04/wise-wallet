import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaidTransactions } from "@/hooks/usePlaid";

interface ActiveSubscriptionsProps {
  itemId: string;
}

interface Subscription {
  name: string;
  amount: number;
  lastPayment: string;
  frequency: string;
  count: number;
}

export function ActiveSubscriptions({ itemId }: ActiveSubscriptionsProps) {
  const { data, isLoading, error } = usePlaidTransactions(itemId, 90); // 3 months to detect patterns

  const subscriptions = useMemo(() => {
    if (!data?.transactions) return [];

    // Group transactions by merchant name
    const merchantGroups = data.transactions
      .filter(t => t.amount > 0) // Only spending
      .reduce((acc, transaction) => {
        const name = transaction.name.toLowerCase().trim();
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(transaction);
        return acc;
      }, {} as Record<string, typeof data.transactions>);

    // Detect recurring payments (3+ transactions with similar amounts)
    const potentialSubscriptions: Subscription[] = [];

    Object.entries(merchantGroups).forEach(([name, transactions]) => {
      if (transactions.length >= 2) {
        // Sort by date
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Check if amounts are similar (within $5)
        const amounts = transactions.map(t => t.amount);
        const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        const isRecurring = amounts.every(amt => Math.abs(amt - avgAmount) <= 5);

        if (isRecurring) {
          // Calculate frequency based on date intervals
          const dateDiffs = [];
          for (let i = 1; i < transactions.length; i++) {
            const diff = Math.abs(
              new Date(transactions[i-1].date).getTime() - 
              new Date(transactions[i].date).getTime()
            ) / (1000 * 60 * 60 * 24); // days
            dateDiffs.push(diff);
          }
          
          const avgDiff = dateDiffs.reduce((sum, diff) => sum + diff, 0) / dateDiffs.length;
          let frequency = 'Unknown';
          
          if (avgDiff >= 28 && avgDiff <= 35) frequency = 'Monthly';
          else if (avgDiff >= 6 && avgDiff <= 8) frequency = 'Weekly';
          else if (avgDiff >= 85 && avgDiff <= 95) frequency = 'Quarterly';
          else if (avgDiff >= 360 && avgDiff <= 370) frequency = 'Yearly';

          potentialSubscriptions.push({
            name: transactions[0].name,
            amount: avgAmount,
            lastPayment: transactions[0].date,
            frequency,
            count: transactions.length
          });
        }
      }
    });

    return potentialSubscriptions
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [data?.transactions]);

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
            {error ? 'Unable to detect subscriptions' : 'No recurring payments detected'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Subscriptions</CardTitle>
        <CardDescription>{subscriptions.length} recurring payments detected</CardDescription>
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
                Last: {format(new Date(subscription.lastPayment), 'MMM dd')}
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