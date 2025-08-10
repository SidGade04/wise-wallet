import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, CreditCard, AlertTriangle } from "lucide-react";

type Props = {
  isPro?: boolean;
  status?: string;
  currentPeriodEnd?: string;
  planName?: string;
  cancelAtPeriodEnd?: boolean;
  onManageBilling: () => void;
  manageLoading?: boolean;
};

export default function SubscriptionSection({ 
  isPro, 
  status,
  currentPeriodEnd,
  planName,
  cancelAtPeriodEnd,
  onManageBilling, 
  manageLoading 
}: Props) {
  // Format the billing date
  const formatBillingDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const billingDate = formatBillingDate(currentPeriodEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Subscription
        </CardTitle>
        <CardDescription>Manage your plan and billing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Current plan</p>
            <p className="text-sm text-muted-foreground">
              {planName || (isPro ? "Pro Plan" : "Free Plan")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isPro ? "default" : "secondary"}>
              {isPro ? "Pro" : "Free"}
            </Badge>
            {status && status !== "active" && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {status}
              </Badge>
            )}
          </div>
        </div>

        {/* Billing Information for Pro Users */}
        {isPro && (
          <>
            <Separator />
            <div className="space-y-3">
              {/* Next Billing Date */}
              {billingDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {cancelAtPeriodEnd ? "Access expires" : "Next billing date"}
                    </p>
                    <p className="text-sm text-muted-foreground">{billingDate}</p>
                  </div>
                </div>
              )}

              {/* Cancellation Notice */}
              {cancelAtPeriodEnd && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Subscription Cancelled
                    </p>
                    <p className="text-sm text-orange-700">
                      Your Pro access will continue until {billingDate}. You can reactivate anytime.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {isPro ? (
            <>
              <Button onClick={onManageBilling} disabled={!!manageLoading}>
                {manageLoading ? "Opening..." : "Manage billing"}
              </Button>
              {!cancelAtPeriodEnd && (
                <Button 
                  variant="outline" 
                  onClick={() => (window.location.href = "/upgrade?downgrade=true")}
                >
                  Cancel subscription
                </Button>
              )}
              {cancelAtPeriodEnd && (
                <Button 
                  variant="outline" 
                  onClick={() => (window.location.href = "/upgrade?reactivate=true")}
                >
                  Reactivate subscription
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => (window.location.href = "/upgrade")}>
              Upgrade to Pro
            </Button>
          )}
        </div>

        {/* Pro Features Preview for Free Users */}
        {!isPro && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Pro features include:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Advanced analytics and insights</li>
                <li>• Priority customer support</li>
                <li>• Extended data history</li>
                <li>• Custom reporting</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}