// Transactions.tsx - Updated to use real Plaid data

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTransformedTransactions, useBankAccounts } from "@/hooks/usePlaid";
import { categories } from "@/data/mockData";
import { format, isWithinInterval, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import { Search, Filter, Edit2, Calendar, Download, RefreshCw, Building2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { PlaidLink } from "@/components/PlaidLink";

// Utility functions
const getCategoryIcon = (categoryName: string) => {
  const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  return category?.icon || '💳';
};

const getCategoryColor = (categoryName: string) => {
  const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
  return category?.color || '#8884d8';
};

export default function Transactions() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [daysToLoad, setDaysToLoad] = useState(90);

  // Fetch data
  const { 
    transactions, 
    isLoading: transactionsLoading, 
    error: transactionsError,
    refetch
  } = useTransformedTransactions(daysToLoad);
  
  const { data: bankAccounts, isLoading: accountsLoading } = useBankAccounts();

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        t => 
          t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(t => 
        t.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let dateRange: { start: Date; end: Date };

      switch (dateFilter) {
        case "today":
          dateRange = { start: subDays(now, 1), end: now };
          break;
        case "thisWeek":
          dateRange = { start: subDays(now, 7), end: now };
          break;
        case "thisMonth":
          dateRange = { start: startOfMonth(now), end: endOfMonth(now) };
          break;
        case "lastMonth":
          const lastMonth = subMonths(now, 1);
          dateRange = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
          break;
        case "last3Months":
          dateRange = { start: subMonths(now, 3), end: now };
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(t => 
        isWithinInterval(t.date, dateRange)
      );
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedCategory, dateFilter]);

  // Calculate metrics
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const expenseAmount = filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const incomeAmount = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  // Get unique categories from transactions
  const availableCategories = useMemo(() => {
    if (!transactions) return [];
    const categorySet = new Set(transactions.map(t => t.category).filter(Boolean));
    return Array.from(categorySet).sort();
  }, [transactions]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Transactions refreshed",
        description: "Your transaction data has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to refresh transactions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no transactions to export with the current filters.",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = ['Date', 'Merchant', 'Category', 'Amount', 'Description', 'Status'];
    const csvData = filteredTransactions.map(t => [
      format(t.date, 'yyyy-MM-dd'),
      t.merchant,
      t.category || 'Other',
      t.amount.toFixed(2),
      t.description || '',
      t.pending ? 'Pending' : 'Completed'
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Exported ${filteredTransactions.length} transactions to CSV`,
    });
  };

  // Loading state
  if (transactionsLoading || accountsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  // if (transactionsError) {
  //   return (
  //     <div className="space-y-6">
  //       <div>
  //         <h1 className="text-3xl font-bold">Transactions</h1>
  //         <p className="text-muted-foreground">
  //           Unable to load transaction data
  //         </p>
  //       </div>

  //       <Card className="shadow-card border-destructive/50">
  //         <CardHeader>
  //           <CardTitle className="text-destructive">Error Loading Transactions</CardTitle>
  //           <CardDescription>
  //             {transactionsError instanceof Error ? transactionsError.message : 'An error occurred while loading transactions'}
  //           </CardDescription>
  //         </CardHeader>
  //         <CardContent>
  //           <div className="flex gap-2">
  //             <Button onClick={handleRefresh} variant="outline">
  //               <RefreshCw className="w-4 h-4 mr-2" />
  //               Retry
  //             </Button>
  //             <Button onClick={() => window.location.reload()} variant="default">
  //               Reload Page
  //             </Button>
  //           </div>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

  // No bank accounts connected
  if (!bankAccounts || bankAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage all your financial transactions
          </p>
        </div>

        <Card className="shadow-card border-dashed">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No Bank Accounts Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your bank account to view your transactions and start tracking your spending.
            </p>
            <PlaidLink>
              <Button variant="financial">
                <Building2 className="w-4 h-4 mr-2" />
                Connect Bank Account
              </Button>
            </PlaidLink>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage all your financial transactions
          </p>
          {transactions && transactions.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing {transactions.length} transactions from the last {daysToLoad} days
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={transactionsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleExportCSV} 
            variant="outline" 
            size="sm"
            disabled={filteredTransactions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.pending).length} pending
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              ${expenseAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.amount < 0).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${incomeAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.amount > 0).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalAmount >= 0 ? 'text-success' : 'text-expense'
            }`}>
              {totalAmount >= 0 ? '+' : ''}${totalAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income - Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter your transactions by search, category, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search merchants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getCategoryIcon(category)} {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="date">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Last 24 Hours</SelectItem>
                  <SelectItem value="thisWeek">Last 7 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="last3Months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Range */}
            <div className="space-y-2">
              <Label htmlFor="days">Data Range</Label>
              <Select value={daysToLoad.toString()} onValueChange={(value) => setDaysToLoad(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            {searchTerm || selectedCategory !== "all" || dateFilter !== "all" ? " (filtered)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory !== "all" || dateFilter !== "all" 
                    ? "No transactions found with current filters" 
                    : "No transactions found"
                  }
                </p>
                {(searchTerm || selectedCategory !== "all" || dateFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("all");
                      setDateFilter("all");
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                    transaction.pending ? 'border-warning/50 bg-warning/5' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {getCategoryIcon(transaction.category || 'Other')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{transaction.merchant}</p>
                        {transaction.isRecurring && (
                          <Badge variant="secondary" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                        {transaction.pending && (
                          <Badge variant="outline" className="text-xs border-warning text-warning">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(transaction.date, 'MMM dd, yyyy • h:mm a')}
                      </p>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {transaction.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.amount < 0 ? 'text-expense' : 'text-success'
                      }`}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: getCategoryColor(transaction.category || 'Other'),
                          color: getCategoryColor(transaction.category || 'Other')
                        }}
                      >
                        {transaction.category || 'Other'}
                      </Badge>
                    </div>

                    {/* Transaction Details Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Transaction Details</DialogTitle>
                          <DialogDescription>
                            Detailed information about this transaction
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Merchant</Label>
                              <p className="text-sm">{transaction.merchant}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Amount</Label>
                              <p className={`text-sm font-medium ${
                                transaction.amount < 0 ? 'text-expense' : 'text-success'
                              }`}>
                                {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Date</Label>
                              <p className="text-sm">{format(transaction.date, 'PPP')}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Category</Label>
                              <p className="text-sm">{transaction.category || 'Other'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Payment Channel</Label>
                              <p className="text-sm capitalize">{transaction.payment_channel || 'Unknown'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Status</Label>
                              <p className="text-sm">{transaction.pending ? 'Pending' : 'Completed'}</p>
                            </div>
                          </div>
                          {transaction.description && (
                            <div>
                              <Label className="text-sm font-medium">Description</Label>
                              <p className="text-sm">{transaction.description}</p>
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-medium">Transaction ID</Label>
                            <p className="text-xs font-mono text-muted-foreground">{transaction.id}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}