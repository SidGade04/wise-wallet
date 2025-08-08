import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransformedTransactions } from "@/hooks/usePlaid";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SpendingByCategoryProps {
  itemId?: string; // Made optional
  days?: number;
}

export function SpendingByCategory({ itemId, days = 30 }: SpendingByCategoryProps) {
  const { transactions, isLoading, error } = useTransformedTransactions(days);

  const categoryData = useMemo(() => {
    if (!transactions?.length) return [];

    // Filter by itemId if provided
    let filteredTransactions = transactions;
    if (itemId) {
      filteredTransactions = transactions.filter(t => t.account_id && itemId);
    }

    const categoryTotals = filteredTransactions
      .filter(t => t.amount < 0) // Only expenses (negative amounts)
      .reduce((acc, transaction) => {
        const category = transaction.category || 'Other';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += Math.abs(transaction.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 6); // Top 6 categories
  }, [transactions, itemId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Top categories this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (error || categoryData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Top categories this month</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error ? 'Unable to load spending data' : 'No spending data available for the selected period'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>
          Top {categoryData.length} categories 
          {itemId ? ' for this account' : ' across all accounts'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="category" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']}
            />
            <Bar 
              dataKey="amount" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
