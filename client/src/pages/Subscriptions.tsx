import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/store/useStore";
import { format, addDays } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Subscriptions() {
  const { subscriptions, updateSubscription } = useStore();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (statusFilter === "active") return sub.isActive;
    if (statusFilter === "inactive") return !sub.isActive;
    return true;
  });

  // Calculate metrics
  const activeSubscriptions = subscriptions.filter(s => s.isActive);
  const monthlyTotal = activeSubscriptions
    .filter(s => s.frequency === 'monthly')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const yearlyTotal = activeSubscriptions
    .filter(s => s.frequency === 'yearly')
    .reduce((sum, s) => sum + s.amount, 0);

  const estimatedMonthlyTotal = monthlyTotal + (yearlyTotal / 12);

  // Find subscriptions billing soon (next 7 days)
  const upcomingBilling = activeSubscriptions.filter(sub => {
    const daysUntilBilling = Math.ceil(
      (sub.nextBillingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilBilling <= 7 && daysUntilBilling >= 0;
  });

  const handleToggleSubscription = (subscriptionId: string, isActive: boolean) => {
    updateSubscription(subscriptionId, { isActive });
    toast({
      title: isActive ? "Subscription activated" : "Subscription paused",
      description: isActive 
        ? "This subscription is now active and will continue billing."
        : "This subscription has been paused. You can reactivate it anytime.",
    });
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage your recurring subscriptions and track spending
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
            <p className="text-xs text-muted-foreground">
              {subscriptions.length - activeSubscriptions.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              ${estimatedMonthlyTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated monthly cost
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
            <CardTitle className="text-sm font-medium">Yearly Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${(yearlyTotal * 0.15).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated vs monthly plans
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
              You have {upcomingBilling.length} subscription{upcomingBilling.length > 1 ? 's' : ''} billing soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingBilling.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-2 bg-background rounded">
                  <span className="font-medium">{sub.merchant}</span>
                  <div className="text-right">
                    <span className="font-medium">${sub.amount}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {format(sub.nextBillingDate, 'MMM dd')}
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
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>
            {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubscriptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No subscriptions found</p>
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
                        <span className="text-lg">
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
                          {!subscription.isActive && (
                            <Badge variant="destructive">Paused</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Next bill: {format(subscription.nextBillingDate, 'MMM dd, yyyy')}</span>
                          <span>Last charge: {format(subscription.lastChargeDate, 'MMM dd, yyyy')}</span>
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

                      {/* Toggle Switch */}
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={subscription.isActive}
                          onCheckedChange={(checked) => 
                            handleToggleSubscription(subscription.id, checked)
                          }
                        />
                        <Label className="text-sm">
                          {subscription.isActive ? 'Active' : 'Paused'}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info for Active Subscriptions */}
                  {subscription.isActive && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Category: {subscription.category}</span>
                        <span>
                          Annual cost: ${
                            subscription.frequency === 'monthly' 
                              ? (subscription.amount * 12).toFixed(2)
                              : subscription.frequency === 'yearly'
                              ? subscription.amount.toFixed(2)
                              : subscription.frequency === 'weekly'
                              ? (subscription.amount * 52).toFixed(2)
                              : (subscription.amount * 4).toFixed(2)
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}