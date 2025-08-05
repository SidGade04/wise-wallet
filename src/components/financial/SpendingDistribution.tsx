import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlaidTransactions } from "@/hooks/usePlaid";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SpendingDistributionProps {
  itemId: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300'
];

export function SpendingDistribution({ itemId }: SpendingDistributionProps) {
  const { data, isLoading, error } = usePlaidTransactions(itemId, 30);

  const distributionData = useMemo(() => {
    if (!data?.transactions) return [];

    const categoryTotals = data.transactions
      .filter(t => t.amount > 0) // Only spending
      .reduce((acc, transaction) => {
        const category = transaction.category?.[0] || 'Other';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += transaction.amount;
        return acc;
      }, {} as Record<string, number>);

    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: ((amount / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [data?.transactions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.category}</p>
          <p className="text-sm text-muted-foreground">
            ${data.amount.toFixed(2)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Distribution</CardTitle>
          <CardDescription>Category breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || distributionData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Distribution</CardTitle>
          <CardDescription>Category breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error ? 'Unable to load spending distribution' : 'No spending data available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Distribution</CardTitle>
        <CardDescription>Category breakdown by percentage</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="amount"
            >
              {distributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {distributionData.slice(0, 6).map((item, index) => (
            <div key={item.category} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate flex-1">{item.category}</span>
              <span className="font-medium">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}