// Subscriptions.tsx - Updated to use real Plaid data for subscription detection

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { format, addDays, differenceInDays, isAfter, isBefore, addMonths, addWeeks } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Info,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { PlaidLink } from "@/components/PlaidLink";

interface DetectedSubscription {
  id: string;
  merchant: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastPayment: Date;
  nextEstimatedPayment: Date;
  transactions: any[];
  confidence: number; // 0-100
  category: string;
  isActive: boolean;
}

interface MerchantGroup {
  originalName: string;
  transactions: any[];
  category: string;
}

const detectSubscriptions = (transactions: any[]): DetectedSubscription[] => {
  // Group transactions by merchant name (normalized)
  const merchantGroups: Record<string, MerchantGroup> = transactions
    .filter(t => t.amount < 0)
    .reduce<Record<string, MerchantGroup>>((acc, transaction) => {
      const normalizedName = transaction.merchant
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

      if (!acc[normalizedName]) {
        acc[normalizedName] = {
          originalName: transaction.merchant,
          transactions: [],
          category: transaction.category || 'Other',
        };
      }
      acc[normalizedName].transactions.push(transaction);
      return acc;
    }, {});

  const detectedSubscriptions: DetectedSubscription[] = [];

  Object.entries(merchantGroups).forEach(([normalizedName, group]) => {
    const { originalName, transactions: merchantTxs, category } = group;
    
    // Need at least 2 transactions to detect pattern
    if (merchantTxs.length < 2) return;

    // Sort transactions by date (newest first)
    merchantTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Check if amounts are consistent (within 10% variance)
    const amounts = merchantTxs.map(t => Math.abs(t.amount));
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const amountVariance = amounts.every(amt => Math.abs(amt - avgAmount) / avgAmount <= 0.1);

    if (!amountVariance) return;

    // Analyze date patterns
    const dateDiffs = [];
    for (let i = 1; i < merchantTxs.length; i++) {
      const diff = differenceInDays(
        new Date(merchantTxs[i-1].date),
        new Date(merchantTxs[i].date)
      );
      if (diff > 0) dateDiffs.push(diff);
    }

    if (dateDiffs.length === 0) return;

    const avgDaysBetween = dateDiffs.reduce((sum, diff) => sum + diff, 0) / dateDiffs.length;
    const dayVariance = dateDiffs.every(diff => Math.abs(diff - avgDaysBetween) <= 5);

    if (!dayVariance) return;

    // Determine frequency
    let frequency: DetectedSubscription['frequency'];
    let confidence = 60; // Base confidence

    if (avgDaysBetween >= 6 && avgDaysBetween <= 8) {
      frequency = 'weekly';
      confidence += 20;
    } else if (avgDaysBetween >= 28 && avgDaysBetween <= 35) {
      frequency = 'monthly';
      confidence += 30;
    } else if (avgDaysBetween >= 85 && avgDaysBetween <= 95) {
      frequency = 'quarterly';
      confidence += 25;
    } else if (avgDaysBetween >= 360 && avgDaysBetween <= 370) {
      frequency = 'yearly';
      confidence += 25;
    } else {
      return; // No recognizable pattern
    }

    // Boost confidence based on number of transactions
    if (merchantTxs.length >= 3) confidence += 10;
    if (merchantTxs.length >= 5) confidence += 10;
    if (merchantTxs.length >= 10) confidence += 10;

    // Calculate next estimated payment
    let nextEstimatedPayment: Date;
    const lastPayment = new Date(merchantTxs[0].date);

    switch (frequency) {
      case 'weekly':
        nextEstimatedPayment = addWeeks(lastPayment, 1);
        break;
      case 'monthly':
        nextEstimatedPayment = addMonths(lastPayment, 1);
        break;
      case 'quarterly':
        nextEstimatedPayment = addMonths(lastPayment, 3);
        break;
      case 'yearly':
        nextEstimatedPayment = addMonths(lastPayment, 12);
        break;
    }

    // Check if subscription appears to be active (last payment within expected timeframe)
    const daysSinceLastPayment = differenceInDays(new Date(), lastPayment);
    const expectedDaysBetween = avgDaysBetween;
    const isActive = daysSinceLastPayment <= (expectedDaysBetween * 1.5); // Allow 50% buffer

    detectedSubscriptions.push({
      id: `${normalizedName}-${frequency}`,
      merchant: originalName,
      amount: avgAmount,
      frequency,
      lastPayment,
      nextEstimatedPayment,
      transactions: merchantTxs,
      confidence: Math.min(confidence, 100),
      category,
      isActive
    });
  });

  return detectedSubscriptions.sort((a, b) => b.confidence - a.confidence);
};

export default function Subscriptions() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");

  // Fetch data
  const { 
    transactions, 
    isLoading: transactionsLoading, 
    error: transactionsError,
    refetch
  } = useTransformedTransactions(180); // 6 months for better pattern detection
  
  const { data: bankAccounts, isLoading: accountsLoading } = useBankAccounts();

  // Detect subscriptions from transactions
  const detectedSubscriptions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    return detectSubscriptions(transactions);
  }, [transactions]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    let filtered = [...detectedSubscriptions];

    if (statusFilter === "active") {
      filtered = filtered.filter(sub => sub.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(sub => !sub.isActive);
    }

    if (frequencyFilter !== "all") {
      filtered = filtered.filter(sub => sub.frequency === frequencyFilter);
    }

    if (confidenceFilter === "high") {
      filtered = filtered.filter(sub => sub.confidence >= 80);
    } else if (confidenceFilter === "medium") {
      filtered = filtered.filter(sub => sub.confidence >= 60 && sub.confidence < 80);
    } else if (confidenceFilter === "low") {
      filtered = filtered.filter(sub => sub.confidence < 60);
    }

    return filtered;
  }, [detectedSubscriptions, statusFilter, frequencyFilter, confidenceFilter]);

  // Calculate metrics
  const activeSubscriptions = detectedSubscriptions.filter(s => s.isActive);
  const monthlyTotal = activeSubscriptions
    .filter(s => s.frequency === 'monthly')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const yearlyTotal = activeSubscriptions
    .filter(s => s.frequency === 'yearly')
    .reduce((sum, s) => sum + s.amount, 0);

  const weeklyTotal = activeSubscriptions
    .filter(s => s.frequency === 'weekly')
    .reduce((sum, s) => sum + s.amount * 4.33, 0); // Convert to monthly

  const quarterlyTotal = activeSubscriptions
    .filter(s => s.frequency === 'quarterly')
    .reduce((sum, s) => sum + (s.amount / 3), 0); // Convert to monthly

  const estimatedMonthlyTotal = monthlyTotal + (yearlyTotal / 12) + weeklyTotal + quarterlyTotal;

  // Find subscriptions billing soon (next 7 days)
  const upcomingBilling = activeSubscriptions.filter(sub => {
    const daysUntilBilling = differenceInDays(sub.nextEstimatedPayment, new Date());
    return daysUntilBilling <= 7 && daysUntilBilling >= 0;
  });

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      case 'weekly': return 'Weekly';
      case 'quarterly': return 'Quarterly';
      default: return frequency;
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'bg-blue-100 text-blue-800';
      case 'yearly': return 'bg-green-100 text-green-800';
      case 'weekly': return 'bg-purple-100 text-purple-800';
      case 'quarterly': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  // Loading state
  if (transactionsLoading || accountsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (transactionsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Unable to load subscription data
          </p>
        </div>

        <Card className="shadow-card border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>
              {transactionsError instanceof Error ? transactionsError.message : 'An error occurred while analyzing subscriptions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No bank accounts connected
  if (!bankAccounts || bankAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage your recurring subscriptions and track spending
          </p>
        </div>

        <Card className="shadow-card border-dashed">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No Bank Accounts Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your bank account to automatically detect recurring subscriptions.
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
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Automatically detected recurring subscriptions and payments
          </p>
          {detectedSubscriptions.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Found {detectedSubscriptions.length} potential subscriptions from transaction analysis
            </p>
          )}
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* AI Detection Notice */}
      <Card className="shadow-card border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">AI-Powered Subscription Detection</p>
              <p className="text-sm text-blue-700 mt-1">
                We analyze your transaction patterns to automatically detect recurring payments and subscriptions. 
                Confidence scores indicate how certain we are about each detection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Detected Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
            <p className="text-xs text-muted-foreground">
              {detectedSubscriptions.length - activeSubscriptions.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estimated Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              ${estimatedMonthlyTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              All frequencies normalized
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bills</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {upcomingBilling.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Due in next 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annual Estimate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              ${(estimatedMonthlyTotal * 12).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Yearly subscription cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bills Alert */}
      {upcomingBilling.length > 0 && (
        <Card className="shadow-card border-warning/50 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-warning">Upcoming Bills</CardTitle>
            </div>
            <CardDescription>
              You have {upcomingBilling.length} subscription{upcomingBilling.length > 1 ? 's' : ''} estimated to bill soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingBilling.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-2 bg-background rounded">
                  <span className="font-medium">{sub.merchant}</span>
                  <div className="text-right">
                    <span className="font-medium">${sub.amount.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {format(sub.nextEstimatedPayment, 'MMM dd')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Filter Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Confidence</Label>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (80%+)</SelectItem>
                  <SelectItem value="medium">Medium (60-79%)</SelectItem>
                  <SelectItem value="low">Low (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Detected Subscriptions</CardTitle>
          <CardDescription>
            {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''} found
            {statusFilter !== "all" || frequencyFilter !== "all" || confidenceFilter !== "all" ? " (filtered)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubscriptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {detectedSubscriptions.length === 0 
                    ? "No recurring subscriptions detected. Try connecting more accounts or wait for more transaction data."
                    : "No subscriptions found with current filters"
                  }
                </p>
                {(statusFilter !== "all" || frequencyFilter !== "all" || confidenceFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setStatusFilter("all");
                      setFrequencyFilter("all");
                      setConfidenceFilter("all");
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              filteredSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                    subscription.isActive ? 'bg-background' : 'bg-muted/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Service Icon/Logo placeholder */}
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-medium">
                          {subscription.merchant.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{subscription.merchant}</h3>
                          <Badge 
                            className={getFrequencyColor(subscription.frequency)}
                            variant="secondary"
                          >
                            {getFrequencyLabel(subscription.frequency)}
                          </Badge>
                          <Badge 
                            className={getConfidenceColor(subscription.confidence)}
                            variant="secondary"
                          >
                            {getConfidenceLabel(subscription.confidence)} ({subscription.confidence}%)
                          </Badge>
                          {!subscription.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Last: {format(subscription.lastPayment, 'MMM dd, yyyy')}</span>
                          <span>Next: {format(subscription.nextEstimatedPayment, 'MMM dd, yyyy')}</span>
                          <span>{subscription.transactions.length} payments detected</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${subscription.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          per {subscription.frequency.replace('ly', '')}
                        </p>
                      </div>

                      {/* Details Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{subscription.merchant} - Subscription Details</DialogTitle>
                            <DialogDescription>
                              Analysis of recurring payment pattern
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Average Amount</Label>
                                <p className="text-lg font-bold">${subscription.amount.toFixed(2)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Frequency</Label>
                                <p className="text-sm">{getFrequencyLabel(subscription.frequency)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Confidence Score</Label>
                                <p className="text-sm">{subscription.confidence}% ({getConfidenceLabel(subscription.confidence)})</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <p className="text-sm">{subscription.isActive ? 'Active' : 'Inactive'}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Category</Label>
                                <p className="text-sm">{subscription.category}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Transactions Found</Label>
                                <p className="text-sm">{subscription.transactions.length}</p>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Recent Transactions</Label>
                              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                {subscription.transactions.slice(0, 10).map((tx, index) => (
                                  <div key={index} className="flex justify-between text-sm p-2 bg-muted rounded">
                                    <span>{format(new Date(tx.date), 'MMM dd, yyyy')}</span>
                                    <span className="font-medium">${Math.abs(tx.amount).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
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