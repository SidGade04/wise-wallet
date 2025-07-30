import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaidLink } from "@/components/PlaidLink";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/store/useAuth";
import { categories } from "@/data/mockData";
import { SpendingByCategory } from "@/types";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PlusCircle,
  Activity
} from "lucide-react";

export default function Dashboard() {
  const { transactions } = useStore();
  const { profile } = useAuth();

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Calculate spending metrics
  const thisMonthTransactions = transactions.filter(t => 
    isWithinInterval(t.date, { start: monthStart, end: monthEnd })
  );

  const totalSpentThisMonth = thisMonthTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const spendingByCategory: SpendingByCategory[] = useMemo(() => {
    const categoryTotals = thisMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((acc, transaction) => {
        const category = categories.find(c => c.name === transaction.category) || 
          { name: transaction.category, color: '#8884d8' };
        
        if (!acc[category.name]) {
          acc[category.name] = {
            category: category.name,
            amount: 0,
            color: category.color
          };
        }
        acc[category.name].amount += Math.abs(transaction.amount);
        return acc;
      }, {} as Record<string, SpendingByCategory>);

    return Object.values(categoryTotals).sort((a, b) => b.amount - a.amount);
  }, [thisMonthTransactions]);

  const recentTransactions = transactions
    .slice(0, 5)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || 'User'}!</h1>
          <p className="text-muted-foreground">
            Here's your financial overview for {format(currentMonth, 'MMMM yyyy')}
          </p>
        </div>
        <PlaidLink>
          <Button variant="financial">
            <PlusCircle className="w-4 h-4 mr-2" />
            Link Bank Account
          </Button>
        </PlaidLink>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              ${totalSpentThisMonth.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {thisMonthTransactions.filter(t => t.amount < 0).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              $246.89/month recurring
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {spendingByCategory[0]?.category || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${spendingByCategory[0]?.amount.toFixed(2) || '0.00'} spent
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">On Track</div>
            <p className="text-xs text-muted-foreground">
              67% of monthly budget used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Spending by Category Bar Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              Your spending breakdown for {format(currentMonth, 'MMMM')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spendingByCategory}>
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

        {/* Spending Distribution Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Spending Distribution</CardTitle>
            <CardDescription>
              Category breakdown as percentages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spendingByCategory}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                  label={({ category, percent }) => 
                    `${category} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {spendingByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest spending activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {categories.find(c => c.name === transaction.category)?.icon || '💳'}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.merchant}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(transaction.date, 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${
                    transaction.amount < 0 ? 'text-expense' : 'text-success'
                  }`}>
                    {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}