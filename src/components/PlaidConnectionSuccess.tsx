import { CheckCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecentTransactions } from "./financial/RecentTransactions";
import { SpendingByCategory } from "./financial/SpendingByCategory";
import { ActiveSubscriptions } from "./financial/ActiveSubscriptions";
import { SpendingDistribution } from "./financial/SpendingDistribution";

interface PlaidConnectionSuccessProps {
  itemId?: string;
  onContinue?: () => void;
}

export function PlaidConnectionSuccess({ itemId, onContinue }: PlaidConnectionSuccessProps) {
  if (!itemId) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="font-medium text-lg">Account Connected!</h3>
          <p className="text-sm text-muted-foreground">
            Your bank account has been successfully linked
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Ready to sync transactions
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Confirmation */}
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="font-medium text-lg">Account Connected!</h3>
          <p className="text-sm text-muted-foreground">
            Your bank account has been successfully linked. Here's your financial overview:
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Live data synced
        </Badge>
      </div>

      {/* Financial Insights Grid */}
      <div className="grid gap-6">
        {/* Recent Transactions */}
        <RecentTransactions itemId={itemId} />
        
        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <SpendingByCategory itemId={itemId} />
          <SpendingDistribution itemId={itemId} />
        </div>
        
        {/* Subscriptions */}
        <ActiveSubscriptions itemId={itemId} />
      </div>

      {/* Continue Button */}
      {onContinue && (
        <div className="text-center pt-4">
          <Button onClick={onContinue} variant="outline">
            Continue to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}